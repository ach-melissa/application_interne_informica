import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/images/logo_informica.png';
import bgImage from '../assets/images/newback.png';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState('');
const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  const errors = {};
  if (!identifier.trim()) errors.identifier = 'Ce champ est requis';
  if (!password) errors.password = 'Ce champ est requis';
  setFieldErrors(errors);
  if (Object.keys(errors).length > 0) return;

  setLoading(true);
  try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      login(data.user, data.token);
if (data.user.role === 'admin') navigate('/admin');
else if (data.user.role === 'prof') navigate('/prof');
else if (data.user.role === 'comptable') navigate('/comptable');
else if (data.user.role === 'super_admin') navigate('/superadmin');
else setError('Rôle non reconnu, contactez un administrateur');
    } catch (err) {
  setError(err.message || 'Une erreur est survenue, veuillez réessayer');
} finally {
  setLoading(false);
}
  };

  const InputIcon = ({ d }) => (
    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </span>
  );

  return (
  <div
    className="min-h-screen w-full flex flex-col justify-between"
    style={{ backgroundImage: `url(${bgImage})`, backgroundSize: '100% 100%' }}
  >
    {/* Logo + title + form, centered */}
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <img src={logo} alt="Infomica" className="h-32 w-auto mb-2 object-contain drop-shadow-md" />
      <p className="text-xs text-gray-600 uppercase tracking-widest mb-8">Portail de connexion</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 w-full max-w-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <div className="relative">
          <InputIcon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        <input
  type="text"
  value={identifier}
  onChange={(e) => { setIdentifier(e.target.value); setFieldErrors((p) => ({ ...p, identifier: '' })); }}
  placeholder="Email ou nom d'utilisateur"
  className={`w-full border bg-white shadow-sm rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
    fieldErrors.identifier ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-950'
  }`}
/>
 </div>
 {fieldErrors.identifier && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.identifier}</p>}
</div>
<div>
  <div className="relative">
    <InputIcon d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    <input
      type={showPassword ? 'text' : 'password'}
      value={password}
      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
      placeholder="••••••••"
      className={`w-full border bg-white shadow-sm rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
        fieldErrors.password ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-950'
      }`}
    />
    <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={showPassword
          ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
          : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        } />
      </svg>
    </button>
  </div>
  {fieldErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.password}</p>}
</div>

        <button type="submit" disabled={loading}
         className="w-full bg-blue-950 hover:bg-blue-900 text-white py-3 rounded-xl font-semibold text-sm ...">
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>

    {/* Footer - gradient text, no background */}
    <footer className="w-full text-center py-4">
      <p className="text-xs font-semibold bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 bg-clip-text text-transparent">
        © {new Date().getFullYear()} Infomica · Tous droits réservés
      </p>
    </footer>
  </div>
);
};

export default Login;