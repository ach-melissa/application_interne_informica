import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard/AdminDashboard';
import ProfDashboard from './pages/prof/ProfDashboard/ProfDashboard';
import ComptableDashboard from './pages/comptable/ComptableDashboard/ComptableDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="/prof" element={
            <PrivateRoute allowedRoles={['prof']}>
              <ProfDashboard />
            </PrivateRoute>
          } />
          <Route path="/comptable" element={
            <PrivateRoute allowedRoles={['comptable']}>
              <ComptableDashboard />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;