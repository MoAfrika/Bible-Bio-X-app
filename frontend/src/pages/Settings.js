import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogOut, Sparkles, Gift, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ShareReferralModal from '../components/ShareReferralModal';

export default function Settings() {
  const { user, logout, credits, fetchReferral } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');
  const [shareOpen, setShareOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);

  const openReferral = async () => {
    const data = await fetchReferral();
    if (data?.referral_code) {
      setReferralData(data);
      setShareOpen(true);
    } else {
      toast.info('Use a premium generation to unlock your referral link');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    }
    
    toast.success(`Switched to ${newTheme} mode`);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="settings-view"
    >
      <h2 className="text-xl font-bold">Settings</h2>
      
      <div className="glass p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name}
                className="w-10 h-10 rounded-full flex-shrink-0"
                data-testid="user-avatar"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ background: 'var(--elevated)', color: 'var(--primary)' }}>
            {user?.role}
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-xl flex items-center justify-between" data-testid="premium-credits-card">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--elevated)' }}
          >
            <Sparkles className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sm font-semibold">Premium Credits</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Deeper AI generations</div>
          </div>
        </div>
        <div
          className="text-2xl font-bold"
          style={{ color: 'var(--primary)', fontFamily: 'Cormorant Garamond, serif' }}
          data-testid="credits-count"
        >
          {credits}
        </div>
      </div>

      <motion.button
        data-testid="refer-friends-card"
        onClick={openReferral}
        whileTap={{ scale: 0.98 }}
        className="w-full glass p-4 rounded-xl flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--elevated)' }}
          >
            <Gift className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sm font-semibold">Refer friends</div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              +1 credit per friend
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
      </motion.button>

      <motion.button
        data-testid="theme-toggle-button"
        onClick={toggleTheme}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 glass rounded-xl font-bold flex items-center justify-between"
      >
        <span>Theme</span>
        <span className="flex items-center gap-2 text-[var(--primary)]">
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </motion.button>

      <motion.button
        data-testid="logout-button"
        onClick={handleLogout}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 glass rounded-xl font-bold flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Logout
      </motion.button>

      <ShareReferralModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        referralCode={referralData?.referral_code}
        referralUrl={referralData?.referral_url}
        referredCount={referralData?.referred_count || 0}
      />
    </motion.div>
  );
}