import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('Missing session ID');
        navigate('/login', { replace: true });
        return;
      }

      try {
        const { data } = await axios.post(
          `${API_URL}/api/auth/session`,
          {},
          {
            headers: { 'X-Session-ID': sessionId },
            withCredentials: true
          }
        );

        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        // Refresh AuthContext so is_new_user + credits are set for welcome modal
        await checkAuth();
        toast.success(`Welcome, ${data.name}!`);
        navigate('/app', { replace: true, state: { user: data } });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, [navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-6">
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-testid="auth-callback-view"
      >
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full glass mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <BookOpen className="w-8 h-8 text-[var(--primary)]" />
        </motion.div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Signing you in...
        </h1>
        <p className="text-[var(--text-secondary)] text-sm flex items-center justify-center gap-2 mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing your sacred space
        </p>
      </motion.div>
    </div>
  );
}
