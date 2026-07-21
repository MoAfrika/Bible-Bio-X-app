import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ShareReferralModal({ open, onClose, referralCode, referralUrl, referredCount = 0 }) {
  const [copied, setCopied] = useState(false);

  // Prefer client-constructed URL for reliability (backend may see internal cluster origin)
  const finalUrl = referralCode
    ? (typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${referralCode}` : referralUrl)
    : referralUrl;

  const shareText = `I've been using Bible Bio X for daily Scripture study — the AI-generated character bios and prayers are beautiful. Try it with my link and we both get a free premium credit:`;

  const handleCopy = async () => {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Could not copy');
    }
  };

  const handleShare = async () => {
    if (!finalUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bible Bio X',
          text: shareText,
          url: finalUrl
        });
      } catch (e) {
        // user cancelled - ignore
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="share-referral-modal"
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm glass rounded-3xl p-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <button
              onClick={onClose}
              data-testid="close-referral-modal"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            <div className="text-center mb-6">
              <motion.div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Gift className="w-7 h-7 text-[var(--primary)]" strokeWidth={1.5} />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Share the gift
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-2">
                Earn <strong className="text-[var(--primary)]">+1 premium credit</strong> for every friend who joins with your link.
              </p>
            </div>

            {referralCode && (
              <div className="glass rounded-xl p-3 mb-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-1">Your link</div>
                  <div className="text-xs truncate font-mono" data-testid="referral-url-display">
                    {finalUrl || `.../login?ref=${referralCode}`}
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  data-testid="copy-referral-button"
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/5"
                  style={{ background: 'var(--elevated)' }}
                  aria-label="Copy link"
                >
                  <Copy className={`w-4 h-4 ${copied ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`} strokeWidth={1.5} />
                </button>
              </div>
            )}

            <motion.button
              onClick={handleShare}
              data-testid="share-referral-button"
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 mb-4"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              <Share2 className="w-4 h-4" strokeWidth={2} />
              Share link
            </motion.button>

            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span data-testid="referred-count-display">
                {referredCount === 0
                  ? 'No friends joined yet'
                  : `${referredCount} friend${referredCount === 1 ? '' : 's'} joined · +${referredCount} credit${referredCount === 1 ? '' : 's'} earned`}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
