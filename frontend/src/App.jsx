import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

//form page 
import InscriptionForm from './pages/InscriptionForm/InscriptionForm';
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
import ArchiveYear from './pages/admin/archive/ArchiveYear';
import ProfPointage from './pages/admin/profs/ProfPointage';


// ── Pages prof (nouvelles) ─────────────────────────────────
import DashboardProf from './pages/prof/dashboard/DashboardProf';
import GroupsProf from './pages/prof/groups/GroupsProf';

// ── Pages comptable (nouvelles) ─────────────────────────────
import DashboardComptable from './pages/comptable/dashboard/DashboardComptable';
import Paiements from './pages/comptable/paiements/Paiements';
import Salaires from './pages/comptable/salaires/Salaires';

// ── Page partagée (nouvelle) ───────────────────────────────
import Profile from './pages/shared/profile/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* ── Public inscription form ── */}
          <Route path="/inscription" element={<InscriptionForm />} />

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
<Route path="/admin/archive/:year" element={
  <PrivateRoute allowedRoles={['admin']}>
    <ArchiveYear />
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

          {/* ── Routes comptable (nouvelles) ── */}
          <Route path="/comptable" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <DashboardComptable />
            </PrivateRoute>
          } />
          <Route path="/comptable/paiements" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <Paiements />
            </PrivateRoute>
          } />
          <Route path="/comptable/salaires" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <Salaires />
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