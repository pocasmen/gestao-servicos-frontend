import React, { useContext, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Ticket, Calendar, History, User, LogOut, ArrowLeft, LayoutDashboard, Cpu } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../contexts/AuthContext';
import { ActiveClientContext } from '../contexts/ActiveClientContext';
import apiClient from '../apiClient';

const ClientPortalHeader: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { activeClient, setActiveClient } = useContext(ActiveClientContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [hasMultipleCompanies, setHasMultipleCompanies] = useState(false);

  React.useEffect(() => {
    const checkCompanies = async () => {
      try {
        const res = await apiClient.get('/api/my-companies');
        setHasMultipleCompanies((res.data || []).length > 1);
      } catch (e) {
        // ignore
      }
    };
    if (user) checkCompanies();
  }, [user]);

  const handleLogout = async () => {
    setActiveClient(null);
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const clientName = activeClient?.name || 'Portal do Cliente';
  const userFirstName = user.user_metadata?.first_name || '';
  const userLastName = user.user_metadata?.last_name || '';
  const displayName = `${userFirstName} ${userLastName}`.trim();

  const closeMenu = () => setExpanded(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4 border-bottom shadow-sm py-0" style={{ minHeight: '30px' }}>
      <div className="container-fluid">
        <div className="navbar-brand d-flex align-items-center position-relative" style={{ minHeight: '30px' }}>
          <img src="/logo512.png" alt="Logo da Empresa" style={{ width: '50px', height: '50px', objectFit: 'contain', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, zIndex: 10 }} />
          {location.pathname !== '/portal' && activeClient && hasMultipleCompanies && (
            <button
              className="btn btn-sm btn-outline-primary d-flex align-items-center me-3 border-0"
              style={{ marginLeft: '55px', opacity: 0.8 }}
              onClick={() => { setActiveClient(null); navigate('/portal'); }}
              title="Trocar Empresa"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="fw-bold text-primary text-truncate" style={{ maxWidth: '250px', marginLeft: location.pathname !== '/portal' && activeClient && hasMultipleCompanies ? '0' : '55px' }}>{clientName}</span>
        </div>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-controls="portal-navbar-nav"
          aria-expanded={expanded}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${expanded ? 'show' : ''}`} id="portal-navbar-nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/portal/dashboard" onClick={closeMenu} className="nav-link d-flex align-items-center gap-2">
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/portal/tickets" onClick={closeMenu} className="nav-link d-flex align-items-center gap-2">
                <Ticket size={18} /> Tickets
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/portal/schedules" onClick={closeMenu} className="nav-link d-flex align-items-center gap-2">
                <Calendar size={18} /> Agendamentos
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/portal/history" onClick={closeMenu} className="nav-link d-flex align-items-center gap-2">
                <History size={18} /> Histórico
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/portal/equipments" onClick={closeMenu} className="nav-link d-flex align-items-center gap-2">
                <Cpu size={18} /> Equipamentos
              </NavLink>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto">
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center gap-2"
                href="#"
                id="portal-nav-dropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <User size={18} />
                <span className="d-none d-lg-inline">{displayName}</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="portal-nav-dropdown">
                <li>
                  <NavLink to="/portal/profile" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                    <User size={16} /> Perfil
                  </NavLink>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button onClick={() => { handleLogout(); closeMenu(); }} className="dropdown-item text-danger d-flex align-items-center gap-2 border-0 bg-transparent w-100 text-start">
                    <LogOut size={16} /> Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default ClientPortalHeader;
