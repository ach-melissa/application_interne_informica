import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-green-600">Informica</h1>
          <p className="text-sm text-gray-500">Professeur</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/prof" className="block px-4 py-2 rounded-lg hover:bg-green-50 text-gray-700">
            Dashboard
          </a>
        </nav>
        <div className="p-4 border-t">
          <p className="text-sm text-gray-600">{user?.prenom} {user?.nom}</p>
          <button onClick={handleLogout} className="mt-2 text-sm text-red-500 hover:underline">
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
};

export default ProfLayout;