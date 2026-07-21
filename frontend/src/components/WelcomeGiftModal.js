import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function WelcomeGiftModal() {
  const { user, dismissWelcome } = useAuth();
  const navigate = useNavigate();

  const show = user && user.is_new_user && (user.premium_credits || 0) > 0;

  const handleClaim = async () => {
    await dismissWelcome();
    navigate('/app/tools/bio');
  };

  const handleClose = async () => {
    await dismissWelcome();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="welcome-gift-modal"
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={handleClose}
          />
          <motion.div
            className="relative w-full max-w-sm glass rounded-3xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <button
              onClick={handleClose}
              data-testid="close-welcome-modal"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'var(--primary)' }}
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <Gift className="w-8 h-8 text-black" strokeWidth={2} />
            </motion.div>

            <h2
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              Welcome, {user?.name?.split(' ')[0]}!
            </h2>

            <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
              A gift to begin your journey:
            </p>

            <div
              className="glass rounded-2xl p-4 mb-6"
              style={{ borderColor: 'var(--primary)', borderWidth: '1px' }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                <span
                  className="text-3xl font-bold"
                  style={{ color: 'var(--primary)', fontFamily: 'Cormorant Garamond, serif' }}
                >
                  {user?.premium_credits || 3}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold">
                Premium AI Generations
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
              Unlock <strong className="text-[var(--text-primary)]">deeper character bios</strong> and
              <strong className="text-[var(--text-primary)]"> richer theological answers</strong> — with cross-references, multiple traditions, and scholarly depth.
            </p>

            <motion.button
              onClick={handleClaim}
              data-testid="claim-welcome-gift"
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full font-bold transition-all"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              Try Your First Premium Bio
            </motion.button>
            <button
              onClick={handleClose}
              className="mt-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
