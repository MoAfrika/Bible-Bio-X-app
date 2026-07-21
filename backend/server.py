from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Constants
JWT_ALGORITHM = "HS256"
BIBLE_API_BASE = "https://bible-api.com"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== PASSWORD HASHING ====================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ==================== JWT TOKENS ====================
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# ==================== AUTH HELPER ====================
async def get_current_user(request: Request) -> dict:
    # Try Google OAuth session_token first
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            possible_token = auth_header[7:]
            # Check if this token looks like a session token (not a JWT)
            if not possible_token.count(".") == 2:
                session_token = possible_token
    
    if session_token:
        session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session_doc:
            expires_at = session_doc["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    # Normalize: expose id field
                    user["_id"] = user.get("user_id", "")
                    return user
    
    # Fall back to JWT access_token
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== BRUTE FORCE PROTECTION ====================
async def check_brute_force(identifier: str) -> None:
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt["count"] >= 5:
        lockout_time = attempt["timestamp"] + timedelta(minutes=15)
        if datetime.now(timezone.utc) < lockout_time:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed_login(identifier: str) -> None:
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {
            "$inc": {"count": 1},
            "$set": {"timestamp": datetime.now(timezone.utc)}
        },
        upsert=True
    )

async def clear_failed_logins(identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})

# ==================== MODELS ====================
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    role: str
    created_at: Optional[datetime] = None
    picture: Optional[str] = None
    auth_provider: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class RefreshTokenInput(BaseModel):
    refresh_token: Optional[str] = None

class ForgotPasswordInput(BaseModel):
    email: EmailStr

class ResetPasswordInput(BaseModel):
    token: str
    new_password: str

class MoodCheckInput(BaseModel):
    mood: str

class SaveVerseInput(BaseModel):
    verse_reference: str
    verse_text: str
    translation: str

class GenerateBioInput(BaseModel):
    character_name: str
    focus: str
    depth: str

class VerseLookupInput(BaseModel):
    reference: str

class VerseExplainerInput(BaseModel):
    reference: str
    style: str

class SermonInput(BaseModel):
    topic: str
    audience: str
    style: str

class ParableInput(BaseModel):
    parable_name: str
    focus: str

class DevotionalInput(BaseModel):
    date: str

class TheologianInput(BaseModel):
    question: str
    complexity: str

class PrayerInput(BaseModel):
    topic: str
    tone: str

class StoryInput(BaseModel):
    topic: str

# ==================== AUTH ENDPOINTS ====================
@api_router.post("/auth/register", response_model=UserResponse)
async def register(input: RegisterInput, response: Response):
    email_lower = input.email.lower()
    
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "_id": ObjectId(),
        "email": email_lower,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    user_id = str(user_doc["_id"])
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    user_doc["_id"] = user_id
    user_doc.pop("password_hash")
    return user_doc

@api_router.post("/auth/login", response_model=UserResponse)
async def login(input: LoginInput, response: Response, request: Request):
    email_lower = input.email.lower()
    identifier = f"{request.client.host}:{email_lower}"
    
    await check_brute_force(identifier)
    
    user = await db.users.find_one({"email": email_lower})
    if not user or not verify_password(input.password, user["password_hash"]):
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await clear_failed_logins(identifier)
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    user["_id"] = user_id
    user.pop("password_hash")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Delete Google session from DB if present
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/session")
async def google_oauth_session(request: Request, response: Response):
    """Exchange Emergent Auth session_id for a session_token cookie."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    # Call Emergent Auth to get user data
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=15.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            data = resp.json()
    except httpx.HTTPError as e:
        logger.error(f"Emergent auth error: {e}")
        raise HTTPException(status_code=502, detail="Auth service unreachable")
    
    email = data["email"].lower()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture", "")
    session_token = data["session_token"]
    
    # Find or create user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("user_id"):
        user_id = existing["user_id"]
        # Update name/picture if changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    elif existing:
        # Legacy user without user_id (JWT-registered) — link Google account
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.update_one(
            {"email": email},
            {"$set": {"user_id": user_id, "picture": picture, "auth_provider": "google"}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "user",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc)
        })
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {
        "_id": user_id,
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "role": "user",
        "auth_provider": "google"
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=900,
            path="/"
        )
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordInput):
    user = await db.users.find_one({"email": input.email.lower()})
    if not user:
        return {"message": "If email exists, reset link has been sent"}
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["_id"],
        "expires_at": expires_at,
        "used": False
    })
    
    reset_link = f"https://devotional-explorer.preview.emergentagent.com/reset-password?token={token}"
    logger.info(f"Password reset link for {input.email}: {reset_link}")
    
    return {"message": "If email exists, reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput):
    reset_doc = await db.password_reset_tokens.find_one({"token": input.token})
    
    if not reset_doc or reset_doc["used"] or reset_doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    await db.users.update_one(
        {"_id": reset_doc["user_id"]},
        {"$set": {"password_hash": hash_password(input.new_password)}}
    )
    
    await db.password_reset_tokens.update_one(
        {"token": input.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successful"}

# ==================== BIBLE API ====================
@api_router.get("/bible/verse")
async def get_verse(reference: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BIBLE_API_BASE}/{reference}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "reference": data.get("reference"),
                    "text": data.get("text"),
                    "translation": data.get("translation_name", "KJV")
                }
            else:
                raise HTTPException(status_code=404, detail="Verse not found")
    except Exception as e:
        logger.error(f"Bible API error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching verse")

@api_router.get("/bible/verse-of-day")
async def get_verse_of_day():
    verses = [
        {"reference": "Matthew 11:28", "text": "Come to me, all you who are weary and burdened, and I will give you rest."},
        {"reference": "Philippians 4:13", "text": "I can do all things through Christ who strengthens me."},
        {"reference": "Jeremiah 29:11", "text": "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."},
        {"reference": "Psalm 46:1", "text": "God is our refuge and strength, an ever-present help in trouble."},
        {"reference": "Proverbs 3:5-6", "text": "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."}
    ]
    import random
    verse = random.choice(verses)
    verse["translation"] = "NIV"
    return verse

# ==================== USER DATA ENDPOINTS ====================
@api_router.post("/mood")
async def save_mood(input: MoodCheckInput, user: dict = Depends(get_current_user)):
    doc = {
        "user_id": user["_id"],
        "mood": input.mood,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.mood_checks.insert_one(doc)
    return {"message": "Mood saved"}

@api_router.get("/mood/history")
async def get_mood_history(user: dict = Depends(get_current_user)):
    moods = await db.mood_checks.find(
        {"user_id": user["_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(30).to_list(30)
    return moods

@api_router.post("/verses/save")
async def save_verse(input: SaveVerseInput, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "verse_reference": input.verse_reference,
        "verse_text": input.verse_text,
        "translation": input.translation,
        "saved_at": datetime.now(timezone.utc)
    }
    await db.saved_verses.insert_one(doc)
    return {"message": "Verse saved", "id": doc["id"]}

@api_router.get("/verses/saved")
async def get_saved_verses(user: dict = Depends(get_current_user)):
    verses = await db.saved_verses.find(
        {"user_id": user["_id"]},
        {"_id": 0}
    ).sort("saved_at", -1).to_list(100)
    return verses

@api_router.delete("/verses/{verse_id}")
async def delete_verse(verse_id: str, user: dict = Depends(get_current_user)):
    result = await db.saved_verses.delete_one({"id": verse_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verse not found")
    return {"message": "Verse deleted"}

# ==================== AI GENERATION ENDPOINTS ====================
def get_llm_chat(system_message: str) -> LlmChat:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message=system_message
    )
    chat.with_model("openai", "gpt-5.2")
    return chat

async def stream_ai_response(prompt: str, system_message: str):
    chat = get_llm_chat(system_message)
    
    async def generate():
        try:
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    yield f"data: {event.content}\n\n"
                elif isinstance(event, StreamDone):
                    yield "data: [DONE]\n\n"
                    break
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@api_router.post("/generate/bio")
async def generate_bio(input: GenerateBioInput, user: dict = Depends(get_current_user)):
    system_message = "You are a biblical scholar and theologian. Provide detailed, accurate, and insightful character biographies from the Bible."
    
    prompt = f"""Generate a comprehensive biography for {input.character_name} from the Bible.

Focus: {input.focus}
Depth: {input.depth}

{"For an Academic Deep-Dive, include:" if input.depth == "Academic Deep-Dive" else ""}
{"- Exegetical Framework & Historiography" if input.depth == "Academic Deep-Dive" else ""}
{"- Typological Significance" if input.depth == "Academic Deep-Dive" else ""}
{"- Theological Tensions & Moral Ambiguity" if input.depth == "Academic Deep-Dive" else ""}
{"- Contemporary Scholarly Consensus" if input.depth == "Academic Deep-Dive" else ""}

Format the response with clear sections using HTML tags (h4, p, div, ul) for proper formatting."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/explainer")
async def generate_explainer(input: VerseExplainerInput, user: dict = Depends(get_current_user)):
    system_message = "You are a biblical scholar. Explain Bible verses with clarity, historical context, and practical application."
    
    prompt = f"""Explain the verse {input.reference} with a focus on: {input.style}

Provide:
1. The verse text
2. Detailed explanation based on the chosen style
3. Practical application for modern readers

Format using HTML tags for clarity."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/sermon")
async def generate_sermon(input: SermonInput, user: dict = Depends(get_current_user)):
    system_message = "You are an experienced pastor and sermon writer. Create compelling, biblical, and practical sermon outlines."
    
    prompt = f"""Create a sermon outline on the topic: {input.topic}

Audience: {input.audience}
Style: {input.style}

Include:
1. Hook (Introduction)
2. Biblical Mandate (Body with scripture references)
3. Application (Conclusion with practical steps)

Format with clear sections using HTML tags."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/parable")
async def generate_parable(input: ParableInput, user: dict = Depends(get_current_user)):
    system_message = "You are a biblical scholar specializing in parables. Explain parables with depth, context, and practical wisdom."
    
    prompt = f"""Analyze the parable: {input.parable_name}

Focus: {input.focus}

Provide:
1. The parable summary
2. {input.focus}
3. Practical application for today

Format with HTML tags for readability."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/devotional")
async def generate_devotional(input: DevotionalInput, user: dict = Depends(get_current_user)):
    system_message = "You are a devotional writer. Create inspiring, biblical, and practical daily devotionals."
    
    prompt = f"""Create a daily devotional for {input.date}.

Include:
1. A relevant Bible verse
2. A short reflection (2-3 paragraphs)
3. A practical prayer or application

Make it encouraging and personal."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/theologian")
async def generate_theologian(input: TheologianInput, user: dict = Depends(get_current_user)):
    system_message = "You are a theologian. Answer questions about theology, doctrine, and biblical interpretation with accuracy and clarity."
    
    prompt = f"""Answer this theological question: {input.question}

Complexity level: {input.complexity}

{"Explain in simple terms suitable for a 5-year-old." if input.complexity == "Explain Like I'm 5" else ""}
{"Provide a simplified but accurate explanation." if input.complexity == "Simplified" else ""}
{"Provide an academic, in-depth theological analysis with proper terminology." if input.complexity == "Academic" else ""}"""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/prayer")
async def generate_prayer(input: PrayerInput, user: dict = Depends(get_current_user)):
    system_message = "You are a prayer guide. Compose heartfelt, biblical prayers that reflect various tones and concerns."
    
    prompt = f"""Compose a prayer about: {input.topic}

Tone: {input.tone}

Make it sincere, biblical, and suitable for personal use. Format it as a prayer."""
    
    return await stream_ai_response(prompt, system_message)

@api_router.post("/generate/story")
async def generate_story(input: StoryInput, user: dict = Depends(get_current_user)):
    system_message = "You are a children's Bible story writer. Create engaging, age-appropriate stories that teach biblical values."
    
    prompt = f"""Create a children's Bible story about: {input.topic}

Make it:
- Engaging for ages 5-10
- Biblically accurate
- Include a clear moral lesson
- Use simple language
- Be 3-4 paragraphs long"""
    
    return await stream_ai_response(prompt, system_message)

# ==================== STARTUP ====================
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@biblebio.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "BibleAdmin2024!")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User Account
- Email: testuser@biblebio.com
- Password: TestUser123!
- Role: user

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

## AI Generation Endpoints
- POST /api/generate/bio
- POST /api/generate/explainer
- POST /api/generate/sermon
- POST /api/generate/parable
- POST /api/generate/devotional
- POST /api/generate/theologian
- POST /api/generate/prayer
- POST /api/generate/story

## Bible Endpoints
- GET /api/bible/verse?reference=John+3:16
- GET /api/bible/verse-of-day

## User Data Endpoints
- POST /api/mood
- GET /api/mood/history
- POST /api/verses/save
- GET /api/verses/saved
- DELETE /api/verses/:id
""")
    logger.info("Test credentials saved to /app/memory/test_credentials.md")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
