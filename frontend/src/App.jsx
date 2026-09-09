import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

//form page 
import InscriptionForm from './pages/InscriptionForm/InscriptionForm';
// ── Pages admin (inchangées) ───────────────────────────────
import Login from './pages/Login';
import Dashboard from './pages/admin/dashboard/Dashboard';
import DemandesSalles from './pages/admin/demandeSalles/DemandesSalles';
import DetailDemandeSalle from './pages/admin/demandeSalles/DetailDemandeSalle';
import Formations from './pages/admin/formations/Formations';
import FormationNiveaux from './pages/admin/formations/niveaux/FormationNiveaux';
import Groups from './pages/admin/formations/groups/Groups';
import GroupDetail from './pages/admin/formations/groups/GroupDetail';
import EmploisGlobal from './pages/admin/formations/EmploisGlobal';
import Utilisateurs from './pages/admin/utilisateurs/Utilisateurs';
import Profs from './pages/admin/profs/Profs';
import Students from './pages/admin/students/Students';
import Archive from './pages/admin/archive/Archive';
import ArchiveYear from './pages/admin/archive/ArchiveYear';
import ArchiveFormation from './pages/admin/archive/ArchiveFormation';
import ArchiveGroupDetail from './pages/admin/archive/ArchiveGroupDetail';
import ProfDetail from './pages/admin/profs/ProfDetail';
import AttestationPrintPage from './components/attestations/AttestationPrintPage';
import Statistique from './pages/admin/statistique/Statistique';
import Parametre from './pages/admin/parametre/Parametre';
import EmploisEcole from './pages/admin/emplois/EmploisEcole';

// ── Pages prof (nouvelles) ─────────────────────────────────
import DashboardProf from './pages/prof/dashboard/DashboardProf';
import MesDemandesSalles from './pages/prof/demandesSalles/MesDemandesSalles';
import DetailMaDemande from './pages/prof/demandesSalles/DetailMaDemande';
import EmploiDuTemps from './pages/prof/EmploiDuTemps';
import ProfLayout from './layouts/ProfLayout';

import ProfFormations from './pages/prof/formations/ProfFormations';
import ProfGroups from './pages/prof/formations/ProfGroups';
import ProfFormationNiveaux from './pages/prof/formations/ProfFormationNiveaux';
import ProfGroupDetail from './pages/prof/formations/ProfGroupDetail';
// ── Pages comptable (nouvelles) ─────────────────────────────
import DashboardComptable from './pages/comptable/dashboard/DashboardComptable';
import StatistiqueComptable from './pages/comptable/statistique/Statistique';
import Paiements from './pages/comptable/paiements/Paiements';
import Charges from "./pages/comptable/Charges/Charges";
import Salaires from './pages/comptable/salaires/Salaires';

// ── Super admin ── 
import SuperAdminDashboard from "./pages/superadmin/dashboard/SuperAdminDashboard";

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
          <Route path="/admin/formations/:id/emplois" element={
  <PrivateRoute allowedRoles={['admin']}>
    <EmploisGlobal />
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
          <Route path="/admin/formations/:id/groups/:groupId/attestations/print" element={
  <PrivateRoute allowedRoles={['admin']}>
    <AttestationPrintPage />
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
          <Route path="/admin/profs/:id" element={
            <PrivateRoute allowedRoles={['admin']}>
              <ProfDetail  />
            </PrivateRoute>
          } />
          <Route path="/admin/students" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Students />
            </PrivateRoute>
          } />
          <Route path="/admin/statistique" element={
  <PrivateRoute allowedRoles={['admin']}>
    <Statistique />
  </PrivateRoute>
} />
<Route path="/admin/parametre" element={
  <PrivateRoute allowedRoles={['admin']}>
    <Parametre />
  </PrivateRoute>
} />
        <Route path="/admin/archive" element={
  <PrivateRoute allowedRoles={['admin']}>
    <Archive />
  </PrivateRoute>
}/>
<Route path="/admin/archive/:year" element={
  <PrivateRoute allowedRoles={['admin']}>
    <ArchiveYear />
  </PrivateRoute>
} />
<Route path="/admin/archive/:year/:formationId" element={
  <PrivateRoute allowedRoles={['admin']}>
    <ArchiveFormation />
  </PrivateRoute>
} />
<Route path="/admin/archive/:year/:formationId/groups/:groupId" element={
  <PrivateRoute allowedRoles={['admin']}>
    <ArchiveGroupDetail />
  </PrivateRoute>
} />

          {/* ── Routes prof (nouvelles) ── */}
          <Route path="/prof" element={
            <PrivateRoute allowedRoles={['prof']}>
              <DashboardProf />
            </PrivateRoute>
          } />
         <Route path="/prof/formations" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <ProfFormations />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/prof/formations/:formationId/groups" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <ProfGroups />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/prof/formations/:formationId/niveaux" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <ProfFormationNiveaux />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/admin/formations/:id/niveaux" element={
  <PrivateRoute allowedRoles={['admin']}>
    <FormationNiveaux />
  </PrivateRoute>
} />
<Route path="/prof/formations/:formationId/groups/:groupId" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <ProfGroupDetail />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/prof/emploi-du-temps" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <EmploiDuTemps />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/prof/mes-demandes-salles" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <MesDemandesSalles />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/prof/mes-demandes-salles/:id" element={
  <PrivateRoute allowedRoles={['prof']}>
    <ProfLayout>
      <DetailMaDemande />
    </ProfLayout>
  </PrivateRoute>
} />
<Route path="/admin/emplois" element={
  <PrivateRoute allowedRoles={['admin']}>
    <EmploisEcole />
  </PrivateRoute>
} />
<Route path="/admin/demandes-salles" element={
  <PrivateRoute allowedRoles={['admin']}>
    <DemandesSalles />
  </PrivateRoute>
} />

<Route path="/admin/demandes-salles/:id" element={
  <PrivateRoute allowedRoles={['admin']}>
    <DetailDemandeSalle />
  </PrivateRoute>
} />

          {/* ── Routes comptable (nouvelles) ── */}
          <Route path="/comptable" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <DashboardComptable />
            </PrivateRoute>
          } />
   <Route path="/comptable/statistique" element={
     <PrivateRoute allowedRoles={['comptable']}>
       <StatistiqueComptable />
     </PrivateRoute>
   } />
          <Route path="/comptable/paiements" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <Paiements />
            </PrivateRoute>
          } />
          <Route path="/comptable/charges" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <Charges />
            </PrivateRoute>
          } />
          <Route path="/comptable/salaires" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <Salaires />
            </PrivateRoute>
          } />
{/* ── Super admin ── */}
<Route path="/superadmin" element={
  <PrivateRoute allowedRoles={['super_admin']}>
    <SuperAdminDashboard />
  </PrivateRoute>
} />

          {/* ── Profil partagé tous rôles (nouvelle) ── */}
          <Route path="/profile" element={
            <PrivateRoute allowedRoles={['admin', 'prof', 'comptable' ,'super_admin']}>
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