import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PremiumToggle({ enabled, onChange }) {
  const { credits } = useAuth();
  const hasCredits = credits > 0;

  return (
    <motion.button
      type="button"
      onClick={() => hasCredits && onChange(!enabled)}
      disabled={!hasCredits}
      whileTap={hasCredits ? { scale: 0.98 } : {}}
      data-testid="premium-toggle"
      className={`w-full glass rounded-xl p-4 flex items-center justify-between transition-all ${
        enabled ? 'ring-1 ring-[var(--primary)]' : ''
      } ${!hasCredits ? 'opacity-60 cursor-not-allowed' : ''}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 text-left">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: enabled ? 'var(--primary)' : 'var(--elevated)' }}
        >
          <Sparkles
            className={`w-5 h-5 ${enabled ? 'text-black' : 'text-[var(--primary)]'}`}
            strokeWidth={1.5}
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            Premium Mode
            {enabled && (
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                ON
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            {hasCredits
              ? `Deeper output — ${credits} generation${credits === 1 ? '' : 's'} left`
              : 'No credits — upgrade to unlock'}
          </div>
        </div>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
          enabled ? '' : 'opacity-60'
        }`}
        style={{ background: enabled ? 'var(--primary)' : 'var(--elevated)' }}
      >
        <motion.div
          className="w-5 h-5 rounded-full absolute top-0.5"
          style={{ background: enabled ? '#000' : 'var(--text-secondary)' }}
          animate={{ left: enabled ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </motion.button>
  );
}
