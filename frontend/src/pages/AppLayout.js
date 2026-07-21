import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import WelcomeGiftModal from '../components/WelcomeGiftModal';
import { motion } from 'framer-motion';

const rootViews = new Set(['/app', '/app/explore', '/app/prayer', '/app/settings']);

export default function AppLayout() {
  const [navStack, setNavStack] = useState(['/app']);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (rootViews.has(location.pathname)) {
      setNavStack([location.pathname]);
    } else {
      setNavStack((prev) => {
        if (prev[prev.length - 1] !== location.pathname) {
          return [...prev, location.pathname];
        }
        return prev;
      });
    }
  }, [location.pathname]);

  const handleBack = () => {
    if (navStack.length > 1) {
      const newStack = [...navStack];
      newStack.pop();
      const prevPath = newStack[newStack.length - 1];
      setNavStack(newStack);
      navigate(prevPath);
    }
  };

  const showBack = navStack.length > 1;

  return (
    <div className="w-full max-w-[480px] h-screen flex flex-col relative mx-auto shadow-2xl overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header 
        title="BIBLE BIO X" 
        showBack={showBack} 
        onBack={handleBack} 
      />
      
      <motion.main 
        className="flex-1 overflow-y-auto scroll-hide px-6 pt-2 pb-24"
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.main>
      
      <BottomNav />
      <WelcomeGiftModal />
    </div>
  );
}
