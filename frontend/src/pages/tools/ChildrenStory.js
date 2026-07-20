import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChildrenStory() {
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a story topic');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const response = await fetch(`${API_URL}/api/generate/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic })
      });

      if (!response.ok) throw new Error('Failed to generate story');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') break;
            text += content;
            setOutput(text);
          }
        }
      }

      toast.success('Story generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate story');
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
      data-testid="children-story-view"
    >
      <h2 className="text-xl font-bold">Children's Story</h2>
      
      <input
        type="text"
        data-testid="story-topic-input"
        placeholder="e.g. Courage, Kindness, Faith"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <motion.button
        data-testid="generate-story-button"
        onClick={handleGenerate}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating story...
          </span>
        ) : (
          'Generate Story'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-xs mt-4 ai-output-box"
          data-testid="story-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </motion.div>
  );
}