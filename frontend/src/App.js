import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from 'sonner';
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./pages/AppLayout";
import Today from "./pages/Today";
import Explore from "./pages/Explore";
import Prayer from "./pages/Prayer";
import Settings from "./pages/Settings";
import CharacterBio from "./pages/tools/CharacterBio";
import VerseLookup from "./pages/tools/VerseLookup";
import VerseExplainer from "./pages/tools/VerseExplainer";
import SermonHelper from "./pages/tools/SermonHelper";
import ParableExplainer from "./pages/tools/ParableExplainer";
import DailyDevotional from "./pages/tools/DailyDevotional";
import AskTheologian from "./pages/tools/AskTheologian";
import ChildrenStory from "./pages/tools/ChildrenStory";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex justify-center items-center" style={{ background: 'var(--bg)' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/app" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Today />} />
              <Route path="explore" element={<Explore />} />
              <Route path="prayer" element={<Prayer />} />
              <Route path="settings" element={<Settings />} />
              
              <Route path="tools/bio" element={<CharacterBio />} />
              <Route path="tools/lookup" element={<VerseLookup />} />
              <Route path="tools/explainer" element={<VerseExplainer />} />
              <Route path="tools/sermon" element={<SermonHelper />} />
              <Route path="tools/parable" element={<ParableExplainer />} />
              <Route path="tools/devotional" element={<DailyDevotional />} />
              <Route path="tools/theologian" element={<AskTheologian />} />
              <Route path="tools/story" element={<ChildrenStory />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)'
          }
        }}
      />
    </AuthProvider>
  );
}

export default App;
