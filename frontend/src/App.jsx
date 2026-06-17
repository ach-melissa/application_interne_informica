import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/admin/dashboard/Dashboard';
import Formations from './pages/admin/formations/Formations';
import Groups from './pages/admin/formations/groups/Groups';
import Utilisateurs from './pages/admin/utilisateurs/Utilisateurs';
import Profs from './pages/admin/profs/Profs';
import Students from './pages/admin/students/Students';
import Archive from './pages/admin/archive/Archive';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Dashboard />
            </PrivateRoute>
          } />
         <Route path="/admin/formations" element={
  <PrivateRoute allowedRoles={['admin']}>
    <Formations />
  </PrivateRoute>
} />
<Route path="/admin/formations/:id/groups" element={
  <PrivateRoute allowedRoles={['admin']}>
    <Groups />
  </PrivateRoute>
} />
          <Route path="/admin/utilisateurs" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Utilisateurs />
            </PrivateRoute>
          } />
          <Route path="/admin/profs" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Profs />
            </PrivateRoute>
          } />
          <Route path="/admin/students" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Students />
            </PrivateRoute>
          } />
          <Route path="/admin/archive" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Archive />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;