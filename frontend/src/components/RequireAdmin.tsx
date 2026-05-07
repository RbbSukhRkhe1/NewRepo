import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
