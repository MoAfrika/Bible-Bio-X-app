import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CharacterBio() {
  const [characterName, setCharacterName] = useState('');
  const [focus, setFocus] = useState('Full Life Arc');
  const [depth, setDepth] = useState('Detailed Breakdown');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!characterName.trim()) {
      toast.error('Please enter a character name');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const response = await fetch(`${API_URL}/api/generate/bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ character_name: characterName, focus, depth })
      });

      if (!response.ok) throw new Error('Failed to generate bio');

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

      toast.success('Biography generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate biography');
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
      data-testid="character-bio-view"
    >
      <h2 className="text-xl font-bold">Character Bio</h2>
      
      <input
        type="text"
        data-testid="bio-name-input"
        placeholder="e.g. Joseph, David, Ruth"
        value={characterName}
        onChange={(e) => setCharacterName(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <div className="flex gap-2">
        <select
          data-testid="bio-focus-select"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="w-full p-4 rounded-xl text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option>Full Life Arc</option>
          <option>Key Facts & Timeline</option>
          <option>Spiritual Lessons</option>
          <option>Character Flaws & Triumphs</option>
        </select>
        <select
          data-testid="bio-depth-select"
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          className="w-full p-4 rounded-xl text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option>Summary</option>
          <option>Detailed Breakdown</option>
          <option>Academic Deep-Dive</option>
        </select>
      </div>
      
      <motion.button
        data-testid="generate-bio-button"
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
          'Generate'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-sm mt-4 ai-output-box space-y-3"
          data-testid="bio-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </motion.div>
  );
}
