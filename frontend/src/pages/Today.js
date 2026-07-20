import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { bibleAPI, moodAPI, versesAPI } from '../utils/api';

const moods = [
  { emoji: '😔', label: 'Struggling', value: 'struggling' },
  { emoji: '🙏', label: 'Hopeful', value: 'hopeful' },
  { emoji: '🌍', label: 'Grateful', value: 'grateful' },
  { emoji: '💔', label: 'Hurting', value: 'hurting' },
  { emoji: '😊', label: 'Joyful', value: 'joyful' }
];

export default function Today() {
  const [verseOfDay, setVerseOfDay] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    loadVerseOfDay();
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  };

  const loadVerseOfDay = async () => {
    try {
      const verse = await bibleAPI.getVerseOfDay();
      setVerseOfDay(verse);
    } catch (error) {
      console.error('Error loading verse:', error);
    }
  };

  const handleMoodSelect = async (mood) => {
    setSelectedMood(mood.value);
    try {
      await moodAPI.save(mood.value);
      toast.success(`Mood logged: ${mood.label}`);
    } catch (error) {
      toast.error('Failed to save mood');
    }
  };

  const handleSaveVerse = async () => {
    if (!verseOfDay) return;
    try {
      await versesAPI.save(verseOfDay.reference, verseOfDay.text, verseOfDay.translation);
      toast.success('Verse saved!');
    } catch (error) {
      toast.error('Failed to save verse');
    }
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="today-view"
    >
      <div>
        <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
          {greeting}.
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">How is your spirit today?</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {moods.map((mood) => (
          <motion.button
            key={mood.value}
            data-testid={`mood-${mood.value}`}
            onClick={() => handleMoodSelect(mood)}
            whileTap={{ scale: 0.95 }}
            className={`glass p-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
              selectedMood === mood.value ? 'ring-2 ring-[var(--primary)]' : ''
            }`}
          >
            <span className="text-2xl">{mood.emoji}</span>
          </motion.button>
        ))}
      </div>

      {verseOfDay && (
        <motion.div
          className="glass p-6 rounded-3xl space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          data-testid="verse-of-day-card"
        >
          <div className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-widest">
            Verse of the Day
          </div>
          <p 
            className="text-lg leading-relaxed text-[var(--text-primary)]" 
            style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}
          >
            "{verseOfDay.text}"
          </p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-secondary)]">
              — {verseOfDay.reference}
            </span>
            <div className="flex gap-2">
              <button 
                data-testid="save-verse-button"
                onClick={handleSaveVerse}
                className="px-4 py-2 rounded-full text-[10px] font-bold transition-colors"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}