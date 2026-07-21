import { Home, Compass, HandHeart, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'home', icon: Home, path: '/app', label: 'Home' },
  { id: 'study', icon: Compass, path: '/app/explore', label: 'Study' },
  { id: 'prayer', icon: HandHeart, path: '/app/prayer', label: 'Prayer' },
  { id: 'settings', icon: Settings, path: '/app/settings', label: 'Settings' }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav 
      className="fixed bottom-6 left-6 right-6 h-[72px] glass rounded-full flex items-center justify-around px-2 z-50 mx-auto max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      data-testid="bottom-navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <motion.button
            key={item.id}
            data-testid={`nav-${item.id}`}
            onClick={() => navigate(item.path)}
            className="p-4 relative"
            whileTap={{ scale: 0.95 }}
          >
            <Icon 
              className={`w-6 h-6 transition-colors ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
              }`}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-[var(--primary)]"
                style={{ transform: 'translateX(-50%)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </motion.nav>
  );
}