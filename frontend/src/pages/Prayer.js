import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STREAM_UPDATE_DEBOUNCE_MS = 100; // Batch updates every 100ms

export default function Prayer() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Humble/Contrite');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const textBufferRef = useRef('');
  const debounceTimerRef = useRef(null);

  const flushBuffer = () => {
    if (textBufferRef.current) {
      setOutput(textBufferRef.current);
    }
  };

  const addToBuffer = (content) => {
    textBufferRef.current += content;
    
    // Clear previous timer and set new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(flushBuffer, STREAM_UPDATE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a prayer topic');
      return;
    }

    setLoading(true);
    setOutput('');
    textBufferRef.current = '';

    try {
      const response = await fetch(`${API_URL}/api/generate/prayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic, tone })
      });

      if (!response.ok) {
        throw new Error('Failed to generate prayer');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const content = line.slice(6);
              if (content === '[DONE]') {
                flushBuffer();
                break;
              }
              addToBuffer(content);
            }
          }
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        flushBuffer();
        toast.error('Connection interrupted while generating prayer');
      }

      toast.success('Prayer generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate prayer');
    } finally {
      setLoading(false);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="prayer-view"
    >
      <h2 className="text-xl font-bold">Prayer & Journal</h2>
      
      <input
        type="text"
        data-testid="prayer-topic-input"
        placeholder="What are you praying for?"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <select
        data-testid="prayer-tone-select"
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <option>Humble/Contrite</option>
        <option>Joyful/Thankful</option>
        <option>Lament/Grief</option>
        <option>Intercessory</option>
      </select>
      
      <motion.button
        data-testid="generate-prayer-button"
        onClick={handleGenerate}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </span>
        ) : (
          'Generate Prayer'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-sm mt-4 ai-output-box"
          data-testid="prayer-output"
        >
          <div 
            className="leading-relaxed" 
            style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '1.125rem' }}
          >
            {output}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
