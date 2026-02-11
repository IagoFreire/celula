import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Schedule from './pages/Schedule';
import Studies from './pages/Studies';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSchedules from './pages/admin/Schedules';
import AdminFinances from './pages/admin/Finances';
import AdminStudyLibrary from './pages/admin/StudyLibrary';
import AdminMembers from './pages/admin/Members';

export default function App() {
  const { loading } = useAuth();

  useEffect(() => {
    // Remove o loader inicial do HTML
    const loader = document.getElementById('root-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.3s';
      setTimeout(() => loader.remove(), 300);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/cronograma" element={<Schedule />} />
        <Route path="/estudos" element={<Studies />} />

        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/cronogramas" element={<ProtectedRoute requireAdmin><AdminSchedules /></ProtectedRoute>} />
        <Route path="/admin/financas" element={<ProtectedRoute requireAdmin><AdminFinances /></ProtectedRoute>} />
        <Route path="/admin/estudos" element={<ProtectedRoute requireAdmin><AdminStudyLibrary /></ProtectedRoute>} />
        <Route path="/admin/membros" element={<ProtectedRoute requireAdmin><AdminMembers /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
