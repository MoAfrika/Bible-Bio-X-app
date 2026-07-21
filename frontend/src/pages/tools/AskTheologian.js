import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PremiumToggle from '../../components/PremiumToggle';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AskTheologian() {
  const [question, setQuestion] = useState('');
  const [complexity, setComplexity] = useState('Simplified');
  const [usePremium, setUsePremium] = useState(false);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshCredits } = useAuth();

  const handleGenerate = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const response = await fetch(`${API_URL}/api/generate/theologian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question, complexity, use_premium: usePremium })
      });

      if (response.status === 402) {
        toast.error('No premium credits remaining');
        setUsePremium(false);
        setLoading(false);
        await refreshCredits();
        return;
      }

      if (!response.ok) throw new Error('Failed to generate answer');

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

      toast.success(usePremium ? 'Premium answer generated!' : 'Answer generated!');
      if (usePremium) await refreshCredits();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate answer');
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
      data-testid="theologian-view"
    >
      <h2 className="text-xl font-bold">Ask Theologian</h2>
      
      <input
        type="text"
        data-testid="theologian-question-input"
        placeholder="Ask your theological question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      
      <select
        data-testid="theologian-complexity-select"
        value={complexity}
        onChange={(e) => setComplexity(e.target.value)}
        className="w-full p-4 rounded-xl text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <option>Explain Like I'm 5</option>
        <option>Simplified</option>
        <option>Academic</option>
      </select>
      
      <PremiumToggle enabled={usePremium} onChange={setUsePremium} />
      
      <motion.button
        data-testid="ask-theologian-button"
        onClick={handleGenerate}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: '#000' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Thinking...
          </span>
        ) : (
          'Ask'
        )}
      </motion.button>
      
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl text-xs mt-4 ai-output-box"
          data-testid="theologian-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </motion.div>
  );
}