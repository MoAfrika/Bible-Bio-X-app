import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SermonHelper() {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('General');
  const [style, setStyle] = useState('Expository');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a sermon topic');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const response = await fetch(`${API_URL}/api/generate/sermon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic, audience, style })
      });

      if (!response.ok) throw new Error('Failed to generate sermon');

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

      toast.success('Sermon outline generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate sermon');
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
      data-testid="sermon-helper-view"
    >
      <h2 className="text-xl font-bold">Sermon Architect</h2>
      
      <input
        type="text"
        data-testid="sermon-topic-input"
        placeholder="Topic..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <select
        data-testid="sermon-audience-select"
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <option>Youth</option>
        <option>General</option>
        <option>Seniors</option>
      </select>
      
      <select
        data-testid="sermon-style-select"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <option>Expository</option>
        <option>Narrative</option>
        <option>Topical</option>
      </select>
      
      <motion.button
        data-testid="craft-sermon-button"
        onClick={handleGenerate}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Crafting...
          </span>
        ) : (
          'Craft Sermon'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-xs mt-4 ai-output-box"
          data-testid="sermon-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </motion.div>
  );
}