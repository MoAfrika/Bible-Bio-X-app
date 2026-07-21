import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Search, Sparkles, Scroll, BookOpen, Sun, MessageCircle, Star } from 'lucide-react';

const tools = [
  { id: 'character-bio', icon: UserCircle, label: 'Bio', path: '/app/tools/bio', description: 'Character biographies' },
  { id: 'verse-lookup', icon: Search, label: 'Lookup', path: '/app/tools/lookup', description: 'Find verses' },
  { id: 'verse-explainer', icon: Sparkles, label: 'Explain', path: '/app/tools/explainer', description: 'Verse explanations' },
  { id: 'sermon-architect', icon: Scroll, label: 'Sermon', path: '/app/tools/sermon', description: 'Sermon architect' },
  { id: 'parable-explainer', icon: BookOpen, label: 'Parable', path: '/app/tools/parable', description: 'Parable explainer' },
  { id: 'daily-devotional', icon: Sun, label: 'Devo', path: '/app/tools/devotional', description: 'Daily devotional' },
  { id: 'ask-theologian', icon: MessageCircle, label: 'Theology', path: '/app/tools/theologian', description: 'Ask questions' },
  { id: 'children-story', icon: Star, label: 'Kids', path: '/app/tools/story', description: "Children's stories" }
];

export default function Explore() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="explore-view"
    >
      <h2 className="text-2xl font-bold">Explore Tools</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.button
              key={tool.id}
              data-testid={`tool-card-${tool.id}`}
              onClick={() => navigate(tool.path)}
              className="glass p-5 rounded-2xl flex flex-col items-start gap-3 transition-all hover:bg-white/5 text-left"
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Icon className="w-6 h-6 text-[var(--primary)]" strokeWidth={1.5} />
              <div>
                <div className="text-sm font-bold mb-1">{tool.label}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{tool.description}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}