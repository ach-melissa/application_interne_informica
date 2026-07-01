import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Tant que la session n'a pas fini d'être vérifiée (ex: nouvel onglet,
  // refresh), on ne redirige pas — sinon on perd l'utilisateur à chaque
  // ouverture d'un nouvel onglet (cas de la page d'impression).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
};

export default PrivateRoute;