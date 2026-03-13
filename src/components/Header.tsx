import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
// Eliminado react-bootstrap
import { Search, User, LogOut, LayoutDashboard, Calendar, Ticket, FileText, Users, Wrench, Package, Settings, FileCheck, CreditCard } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../contexts/AuthContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { UserRole } from '../constants/enums';
import AboutModal from './AboutModal';

const isInternalUser = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === UserRole.TECHNICIAN || role === UserRole.OFFICE_STAFF || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
};

const isUserAdmin = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

const isSystemAdmin = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === UserRole.SUPER_ADMIN;
}

const Header: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementação simples de navegação baseada no termo
    const term = searchTerm.toLowerCase();
    const routes: { [key: string]: string } = {
      'dash': '/dashboard',
      'cal': '/calendar',
      'tick': '/tickets',
      'rel': '/reports',
      'cli': '/clients',
      'equip': '/equipments',
      'inv': '/inventory',
      'perf': '/profile',
      'conf': '/settings',
      'fat': '/billing',
      'tare': '/tasks'
    };

    const found = Object.keys(routes).find(key => term.includes(key));
    if (found) {
      navigate(routes[found]);
      setExpanded(false);
      setSearchTerm('');
    }
  };

  const displayName = user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : user?.email;

  const closeMenu = () => setExpanded(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm border-bottom border-secondary border-opacity-25 mb-4" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(33, 37, 41, 0.95)' }}>
      <div className="container-fluid">
        <NavLink to="/" onClick={closeMenu} className="navbar-brand d-flex align-items-center gap-2">
          <img src="/logo512.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span className="d-none d-sm-inline">Gestão de Serviços</span>
          <span className="d-inline d-sm-none">GS</span>
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-controls="basic-navbar-nav"
          aria-expanded={expanded}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${expanded ? 'show' : ''}`} id="basic-navbar-nav">
          {isInternalUser(user) && (
            <ul className="navbar-nav me-auto my-2 my-lg-0">
              <li className="nav-item">
                <NavLink to="/dashboard" onClick={closeMenu} className="nav-link">Dashboard</NavLink>
              </li>

              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" id="nav-dropdown-operacional" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Operacional
                </a>
                <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="nav-dropdown-operacional">
                  <li>
                    <NavLink to="/tickets" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <Ticket size={16} /> Tickets
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/calendar" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <Calendar size={16} /> Calendário
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/reports" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <FileText size={16} /> Relatórios
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/tasks" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <FileCheck size={16} /> Tarefas
                    </NavLink>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" id="nav-dropdown-recursos" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Recursos
                </a>
                <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="nav-dropdown-recursos">
                  <li>
                    <NavLink to="/clients" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <Users size={16} /> Clientes
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/equipments" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <Wrench size={16} /> Equipamentos
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/inventory" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                      <Package size={16} /> Inventário
                    </NavLink>
                  </li>
                </ul>
              </li>

              {(isUserAdmin(user) || user?.user_metadata?.role === UserRole.OFFICE_STAFF) && (
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" id="nav-dropdown-admin" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Administração
                  </a>
                  <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="nav-dropdown-admin">
                    {isUserAdmin(user) && (
                      <>
                        <li>
                          <NavLink to="/technicians" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                            <Users size={16} /> Funcionários
                          </NavLink>
                        </li>
                        <li>
                          <NavLink to="/users" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                            <Users size={16} /> Utilizadores
                          </NavLink>
                        </li>
                        <li>
                          <NavLink to="/admin/pending-users" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                            <FileCheck size={16} /> Aprovações
                          </NavLink>
                        </li>
                      </>
                    )}

                    {(isUserAdmin(user) || user?.user_metadata?.role === UserRole.OFFICE_STAFF) && (
                      <li>
                        <NavLink to="/billing" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                          <CreditCard size={16} /> Faturação
                        </NavLink>
                      </li>
                    )}

                    {isSystemAdmin(user) && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <NavLink to="/settings" onClick={closeMenu} className="dropdown-item d-flex align-items-center gap-2">
                            <Settings size={16} /> Configurações
                          </NavLink>
                        </li>
                      </>
                    )}
                  </ul>
                </li>
              )}
            </ul>
          )}

          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            {isInternalUser(user) && (
              <form className="d-flex" onSubmit={handleSearch}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-dark border-secondary text-light">
                    <Search size={14} />
                  </span>
                  <input
                    type="search"
                    placeholder="Ir para..."
                    className="form-control bg-dark border-secondary text-light"
                    aria-label="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </form>
            )}

            {user ? (
              <div className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle text-light d-flex align-items-center gap-2"
                  href="#"
                  id="nav-dropdown-user"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <User size={18} />
                  <span className="d-none d-lg-inline">{displayName}</span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark shadow" aria-labelledby="nav-dropdown-user">
                  <li>
                    <NavLink to="/profile" onClick={closeMenu} className="dropdown-item">
                      Perfil
                    </NavLink>
                  </li>
                  <li>
                    <button onClick={() => { setShowAbout(true); closeMenu(); }} className="dropdown-item">
                      Acerca
                    </button>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button onClick={() => { handleLogout(); closeMenu(); }} className="dropdown-item text-danger d-flex align-items-center gap-2">
                      <LogOut size={16} /> Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <NavLink className="btn btn-outline-light btn-sm" to="/login" onClick={closeMenu}>Login</NavLink>
            )}
          </div>
        </div>
      </div>
      <AboutModal show={showAbout} onClose={() => setShowAbout(false)} />
    </nav>

  );
};

export default Header;