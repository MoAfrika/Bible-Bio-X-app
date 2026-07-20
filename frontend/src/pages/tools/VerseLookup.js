import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { bibleAPI } from '../../utils/api';

export default function VerseLookup() {
  const [reference, setReference] = useState('');
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!reference.trim()) {
      toast.error('Please enter a verse reference');
      return;
    }

    setLoading(true);
    try {
      const data = await bibleAPI.getVerse(reference);
      setVerse(data);
      toast.success('Verse found!');
    } catch (error) {
      toast.error('Verse not found');
      setVerse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="verse-lookup-view"
    >
      <h2 className="text-xl font-bold">Verse Lookup</h2>
      
      <div className="relative">
        <input
          type="text"
          data-testid="lookup-reference-input"
          placeholder="e.g. John 3:16, Psalm 23, Romans 8:28"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full p-4 pr-12 rounded-xl text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
      </div>
      
      <motion.button
        data-testid="search-verse-button"
        onClick={handleSearch}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Searching...
          </span>
        ) : (
          'Search'
        )}
      </motion.button>
      
      {verse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-xs mt-4 ai-output-box"
          data-testid="lookup-output"
        >
          <div 
            className="text-lg mb-2" 
            style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--primary)' }}
          >
            "{verse.text}"
          </div>
          <p className="text-xs mt-2 font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            {verse.reference} ({verse.translation})
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}