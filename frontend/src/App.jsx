import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// ── Pages admin (inchangées) ───────────────────────────────
import Login from './pages/Login';
import Dashboard from './pages/admin/dashboard/Dashboard';
import Formations from './pages/admin/formations/Formations';
import Groups from './pages/admin/formations/groups/Groups';
import GroupDetail from './pages/admin/formations/groups/GroupDetail';
import Utilisateurs from './pages/admin/utilisateurs/Utilisateurs';
import Profs from './pages/admin/profs/Profs';
import Students from './pages/admin/students/Students';
import Archive from './pages/admin/archive/Archive';
import ProfPointage from './pages/admin/profs/ProfPointage';

// ── Pages prof (nouvelles) ─────────────────────────────────
import DashboardProf from './pages/prof/dashboard/DashboardProf';
import GroupsProf from './pages/prof/groups/GroupsProf';

// ── Page partagée (nouvelle) ───────────────────────────────
import Profile from './pages/shared/profile/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ── Routes admin (inchangées) ── */}
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
          <Route path="/admin/formations/:id/groups/:groupId" element={
            <PrivateRoute allowedRoles={['admin']}>
              <GroupDetail />
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
          <Route path="/admin/profs/:id/pointage" element={
            <PrivateRoute allowedRoles={['admin']}>
              <ProfPointage />
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

          {/* ── Routes prof (nouvelles) ── */}
          <Route path="/prof" element={
            <PrivateRoute allowedRoles={['prof']}>
              <DashboardProf />
            </PrivateRoute>
          } />
          <Route path="/prof/groups" element={
            <PrivateRoute allowedRoles={['prof']}>
              <GroupsProf />
            </PrivateRoute>
          } />

          {/* ── Profil partagé tous rôles (nouvelle) ── */}
          <Route path="/profile" element={
            <PrivateRoute allowedRoles={['admin', 'prof', 'comptable']}>
              <Profile />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;