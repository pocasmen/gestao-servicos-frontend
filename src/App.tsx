import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

import Header from './components/Header';
import ClientPortalHeader from './components/ClientPortalHeader';
import { ConfirmProvider } from './contexts/ConfirmContext';
import './index.css';
import './theme.css';

// Lazy load pages for better performance and smaller initial bundle
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ClientsPage = React.lazy(() => import('./pages/ClientsPage'));
const EquipmentsPage = React.lazy(() => import('./pages/EquipmentsPage'));
const EquipmentHistoryPage = React.lazy(() => import('./pages/EquipmentHistoryPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const TechniciansPage = React.lazy(() => import('./pages/TechniciansPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const ReportPrintPage = React.lazy(() => import('./pages/ReportPrintPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const TicketsPage = React.lazy(() => import('./pages/TicketsPage'));
const TicketDetailPage = React.lazy(() => import('./pages/TicketDetailPage'));
const ClientTicketsPage = React.lazy(() => import('./pages/ClientTicketsPage'));
const ClientTicketDetailPage = React.lazy(() => import('./pages/ClientTicketDetailPage'));
const ClientSchedulesListPage = React.lazy(() => import('./pages/ClientSchedulesListPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SelfRegisterPage = React.lazy(() => import('./pages/SelfRegisterPage'));
const PendingUsersPage = React.lazy(() => import('./pages/PendingUsersPage'));
const CompleteRegistrationPage = React.lazy(() => import('./pages/CompleteRegistrationPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ClientProfilePage = React.lazy(() => import('./pages/ClientProfilePage'));
const ClientHistoryPage = React.lazy(() => import('./pages/ClientHistoryPage'));
const BillingPage = React.lazy(() => import('./pages/BillingPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const ClientPortalDashboardPage = React.lazy(() => import('./pages/ClientPortalDashboardPage'));
const ClientEntityDashboardPage = React.lazy(() => import('./pages/ClientEntityDashboardPage'));
const ClientEquipmentsPage = React.lazy(() => import('./pages/ClientEquipmentsPage'));

import { AuthContext } from './contexts/AuthContext';
import { ActiveClientProvider } from './contexts/ActiveClientContext';
import { UserRole } from './constants/enums';

// Helper para verificar a role do utilizador
const userHasRole = (user: SupabaseUser | null, role: UserRole) => {
  return user?.user_metadata?.role === role;
};

const isInternalUser = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === UserRole.TECHNICIAN || role === UserRole.OFFICE_STAFF || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

const isPendingClient = (user: SupabaseUser | null) => {
  return user?.user_metadata?.role === UserRole.PENDING_CLIENT;
}

const mustSetPassword = (user: SupabaseUser | null) => {
  return user?.user_metadata?.must_set_password === true;
}

const isProfileIncomplete = (user: SupabaseUser | null) => {
  if (!user || user?.user_metadata?.role !== UserRole.CLIENT) return false;
  const { first_name, last_name, client_role } = user.user_metadata;
  return !first_name || !last_name || !client_role;
};

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

  // Redirection for Incomplete Profiles (Client Portal only)
  if (isProfileIncomplete(user) && !location.pathname.includes('/portal/profile') && userHasRole(user, UserRole.CLIENT)) {
    return <Navigate to="/portal/profile" replace />;
  }

  const userRole = user.user_metadata.role;
  if (!allowedRoles.includes(userRole)) {
    if (isInternalUser(user)) {
      return <Navigate to="/dashboard" replace />;
    } else if (userHasRole(user, UserRole.CLIENT)) {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Componente Interno para conter a lógica das rotas
const AppRoutes: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se existem erros no hash da URL (formato do Supabase)
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
        let message = 'O link que utilizou expirou ou é inválido.';

        if (errorDescription?.includes('expired')) {
          message = 'O link de acesso expirou. Por favor, peça um novo link ou tente fazer login.';
        }

        setUrlError(message);

        // Limpar o hash da URL para não mostrar o erro novamente ao atualizar
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, []);

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">A carregar sessão...</div>;
  }

  const renderHeader = () => {
    if (!user) return null;
    if (isInternalUser(user)) {
      return <Header />;
    }
    if (userHasRole(user, UserRole.CLIENT)) {
      return <ClientPortalHeader />;
    }
    return null;
  };

  return (
    <>
      {renderHeader()}
      <main className="app-main">
        {urlError && (
          <div className="container mt-3">
            <div className="alert alert-warning alert-dismissible fade show mx-auto" role="alert" style={{ maxWidth: '600px' }}>
              <strong>Aviso:</strong> {urlError}
              <button type="button" className="btn-close" onClick={() => setUrlError(null)} aria-label="Close"></button>
            </div>
          </div>
        )}

        {isProfileIncomplete(user) && location.pathname === '/portal/profile' && (
          <div className="container mt-3">
            <div className="glass-panel p-3 rounded-4 shadow-sm mb-4 border-0 animate__animated animate__fadeInDown"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.15))',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 193, 7, 0.25)',
                color: '#856404'
              }}>
              <div className="d-flex align-items-center">
                <div className="bg-warning text-white p-2 rounded-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                  <i className="bi bi-person-fill-exclamation fs-3"></i>
                </div>
                <div>
                  <h5 className="mb-1 fw-bold">Perfil Incompleto</h5>
                  <p className="mb-0 small opacity-75">Por favor, acabe de preencher os seus dados obrigatórios (Nome, Apelido e Função) para poder utilizar todas as funcionalidades do portal.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <React.Suspense fallback={<div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">A carregar...</span></div></div>}>
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
                    : isProfileIncomplete(user)
                      ? <Navigate to="/portal/profile" />
                      : isInternalUser(user)
                        ? <Navigate to="/dashboard" />
                        : <Navigate to="/portal" />
              }
            />

            {/* Rotas de Admin/Técnico */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><DashboardPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><CalendarPage /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><ClientsPage /></ProtectedRoute>} />
            <Route path="/equipments" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><EquipmentsPage /></ProtectedRoute>} />
            <Route path="/equipments/:id/history" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><EquipmentHistoryPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><InventoryPage /></ProtectedRoute>} />
            <Route path="/technicians" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}><TechniciansPage /></ProtectedRoute>} />
            <Route path="/admin/pending-users" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}><PendingUsersPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><ReportsPage /></ProtectedRoute>} />
            <Route path="/report/print/:id" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CLIENT]}><ReportPrintPage /></ProtectedRoute>} />
            <Route path="/tickets" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><TicketsPage /></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><TicketDetailPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}><SettingsPage /></ProtectedRoute>} /> {/* Apenas SuperAdmin pode mexer nas configs */}
            <Route path="/billing" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OFFICE_STAFF]}><BillingPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><TasksPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.OFFICE_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]}><ProfilePage /></ProtectedRoute>} />

            {/* Rotas de Cliente (Flattened) */}
            <Route path="/portal" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientPortalDashboardPage /></ProtectedRoute>} />
            <Route path="/portal/dashboard" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientEntityDashboardPage /></ProtectedRoute>} />
            <Route path="/portal/tickets" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientTicketsPage /></ProtectedRoute>} />
            <Route path="/portal/tickets/:id" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientTicketDetailPage /></ProtectedRoute>} />
            <Route path="/portal/schedules" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientSchedulesListPage /></ProtectedRoute>} />
            <Route path="/portal/history" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientHistoryPage /></ProtectedRoute>} />
            <Route path="/portal/equipments" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientEquipmentsPage /></ProtectedRoute>} />
            <Route path="/portal/profile" element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]}><ClientProfilePage /></ProtectedRoute>} />

          </Routes>
        </React.Suspense>
      </main>
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
      <ConfirmProvider>
        <ActiveClientProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ActiveClientProvider>
      </ConfirmProvider>
    </AuthContext.Provider>
  );
}

export default App;
