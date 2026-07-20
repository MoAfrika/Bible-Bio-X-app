import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await register(email, password, name);
    
    if (result.success) {
      toast.success('Welcome to Bible Bio X!');
      navigate('/app');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full glass mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <BookOpen className="w-8 h-8 text-[var(--primary)]" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Join Bible Bio X
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">Begin your journey of biblical discovery</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          <div>
            <input
              type="text"
              data-testid="register-name"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl glass text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <input
              type="email"
              data-testid="register-email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl glass text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <input
              type="password"
              data-testid="register-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl glass text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          </div>
          <motion.button
            type="submit"
            data-testid="register-submit-button"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-full font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline" data-testid="login-link">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}