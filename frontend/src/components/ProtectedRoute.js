import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // If session_id is in URL, AuthCallback will handle it — don't redirect
  if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="loading-shimmer text-[var(--primary)] text-xl" data-testid="loading-spinner">
          Loading...
        </div>
      </div>
    );
  }

  if (user === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
}