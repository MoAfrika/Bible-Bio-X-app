import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header({ title, showBack, onBack }) {
  return (
    <motion.header 
      className="pt-12 pb-4 px-6 flex items-center justify-between z-40 h-[90px]"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        data-testid="back-button"
        onClick={onBack}
        className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all ${
          showBack ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transform: showBack ? 'scale(1)' : 'scale(0.9)' }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-secondary)]">
        {title}
      </h1>
      <div className="w-10"></div>
    </motion.header>
  );
}