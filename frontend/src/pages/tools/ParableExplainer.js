import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STREAM_UPDATE_DEBOUNCE_MS = 100; // Batch updates every 100ms

export default function ParableExplainer() {
  const [parableName, setParableName] = useState('');
  const [focus, setFocus] = useState('Historical & Cultural Context');
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
    if (!parableName.trim()) {
      toast.error('Please enter a parable name');
      return;
    }

    setLoading(true);
    setOutput('');
    textBufferRef.current = '';

    try {
      const response = await fetch(`${API_URL}/api/generate/parable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parable_name: parableName, focus })
      });

      if (!response.ok) throw new Error('Failed to generate parable explanation');

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
        toast.error('Connection interrupted while generating analysis');
      }

      toast.success('Parable analysis generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate analysis');
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
      data-testid="parable-explainer-view"
    >
      <h2 className="text-xl font-bold">Parable Explainer</h2>
      
      <input
        type="text"
        data-testid="parable-name-input"
        placeholder="e.g. Prodigal Son, Good Samaritan"
        value={parableName}
        onChange={(e) => setParableName(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <select
        data-testid="parable-focus-select"
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <option>Historical & Cultural Context</option>
        <option>Spiritual Application</option>
        <option>Prophetic Meaning</option>
      </select>
      
      <motion.button
        data-testid="analyze-parable-button"
        onClick={handleGenerate}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </span>
        ) : (
          'Analyze'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-sm mt-4 ai-output-box space-y-3"
          data-testid="parable-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </motion.div>
  );
}