import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'light') {
      document.body.classList.add('light');
    } else {
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
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{user?.name}</div>
            <div className="text-xs text-[var(--text-secondary)]">{user?.email}</div>
          </div>
          <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--elevated)', color: 'var(--primary)' }}>
            {user?.role}
          </div>
        </div>
      </div>

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
    </motion.div>
  );
}