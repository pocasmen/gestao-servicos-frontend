import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

import Header from './components/Header';
import ClientPortalHeader from './components/ClientPortalHeader';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import EquipmentsPage from './pages/EquipmentsPage';
import EquipmentHistoryPage from './pages/EquipmentHistoryPage';
import InventoryPage from './pages/InventoryPage';
import TechniciansPage from './pages/TechniciansPage';
import ReportsPage from './pages/ReportsPage';
import ReportPrintPage from './pages/ReportPrintPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import ClientTicketsPage from './pages/ClientTicketsPage';
import ClientTicketDetailPage from './pages/ClientTicketDetailPage';
import ClientSchedulesListPage from './pages/ClientSchedulesListPage';
import SettingsPage from './pages/SettingsPage';
import SelfRegisterPage from './pages/SelfRegisterPage';
import PendingUsersPage from './pages/PendingUsersPage';
import CompleteRegistrationPage from './pages/CompleteRegistrationPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';
import './theme.css';

type UserRole = 'client' | 'technician' | 'admin';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  setSession: () => { },
});

// Helper para verificar a role do utilizador
const userHasRole = (user: SupabaseUser | null, role: UserRole) => {
  return user?.user_metadata?.role === role;
};

const isInternalUser = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === 'technician' || role === 'admin';
}

const isPendingClient = (user: SupabaseUser | null) => {
  return user?.user_metadata?.role === 'pending_client';
}

const mustSetPassword = (user: SupabaseUser | null) => {
  return user?.user_metadata?.must_set_password === true;
}

// Componente para Rotas Protegidas
interface ProtectedRouteProps {
  allowedRoles: Array<UserRole>;
  redirectPath?: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, redirectPath = '/login', children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div>A carregar...</div>; // Ou um spinner
  }

  if (!user) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  const userRole = user.user_metadata.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    if (isInternalUser(user)) {
      return <Navigate to="/dashboard" replace />;
    } else if (userHasRole(user, 'client')) {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Componente Interno para conter a lógica das rotas
const AppRoutes: React.FC = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">A carregar sessão...</div>;
  }

  const renderHeader = () => {
    if (!user) return null;
    if (isInternalUser(user)) {
      return <Header />;
    }
    if (userHasRole(user, 'client')) {
      return <ClientPortalHeader />;
    }
    return null;
  };

  return (
    <>
      {renderHeader()}
      <div className="container-fluid">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/self-register" element={<SelfRegisterPage />} />
          <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
          <Route path="/unauthorized" element={<div>Acesso Negado</div>} />

          <Route
            path="/"
            element={
              !user
                ? <Navigate to="/login" />
                : (isPendingClient(user) || mustSetPassword(user))
                  ? <Navigate to="/complete-registration" />
                  : isInternalUser(user)
                    ? <Navigate to="/dashboard" />
                    : <Navigate to="/portal" />
            }
          />

          {/* Rotas de Admin/Técnico */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><CalendarPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><ClientsPage /></ProtectedRoute>} />
          <Route path="/equipments" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><EquipmentsPage /></ProtectedRoute>} />
          <Route path="/equipments/:id/history" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><EquipmentHistoryPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><InventoryPage /></ProtectedRoute>} />
          <Route path="/technicians" element={<ProtectedRoute allowedRoles={['admin']}><TechniciansPage /></ProtectedRoute>} />
          <Route path="/admin/pending-users" element={<ProtectedRoute allowedRoles={['admin']}><PendingUsersPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/report/print/:id" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><ReportPrintPage /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><TicketsPage /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><TicketDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} /> {/* Apenas Admin pode mexer nas configs */}
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['technician', 'admin']}><ProfilePage /></ProtectedRoute>} />

          {/* Rotas de Cliente (Flattened) */}
          <Route path="/portal" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/portal/tickets" element={<ProtectedRoute allowedRoles={['client']}><ClientTicketsPage /></ProtectedRoute>} />
          <Route path="/portal/tickets/:id" element={<ProtectedRoute allowedRoles={['client']}><ClientTicketDetailPage /></ProtectedRoute>} />
          <Route path="/portal/schedules" element={<ProtectedRoute allowedRoles={['client']}><ClientSchedulesListPage /></ProtectedRoute>} />
          {/* Adicionada rota para o histórico de equipamento do cliente */}
          <Route path="/portal/equipments/:id/history" element={<ProtectedRoute allowedRoles={['client']}><EquipmentHistoryPage /></ProtectedRoute>} />

        </Routes>
      </div>
    </>
  );
};

// Componente Principal App
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, setSession }}>
      <Router>
        <AppRoutes />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
