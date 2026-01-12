import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AuthContext } from '../App';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const isInternalUser = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === 'technician' || role === 'office_staff' || role === 'admin' || role === 'super_admin';
};

const isUserAdmin = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === 'admin' || role === 'super_admin';
}

const isSystemAdmin = (user: SupabaseUser | null) => {
  const role = user?.user_metadata?.role;
  return role === 'super_admin';
}

const Header: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const displayName = user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : user?.email;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <NavLink className="navbar-brand" to="/">
          Gestão de Serviços
        </NavLink>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          {isInternalUser(user) && (
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item"><NavLink className="nav-link" to="/dashboard">Dashboard</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/calendar">Calendário</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/clients">Clientes</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/equipments">Equipamentos</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/inventory">Inventário</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/reports">Relatórios</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/tickets">Tickets</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/profile">Perfil</NavLink></li>

              {/* User Management (Admin & SuperAdmin) */}
              {isUserAdmin(user) && (
                <>
                  <li className="nav-item"><NavLink className="nav-link" to="/technicians">Utilizadores</NavLink></li>
                  <li className="nav-item"><NavLink className="nav-link" to="/admin/pending-users">Aprovações</NavLink></li>
                </>
              )}

              {/* System Settings (SuperAdmin Only) */}
              {isSystemAdmin(user) && (
                <li className="nav-item"><NavLink className="nav-link" to="/settings">Configurações</NavLink></li>
              )}
            </ul>
          )}

          {user ? (
            <div className="d-flex align-items-center text-white">
              <span className="navbar-text me-3">
                Utilizador: {displayName}
              </span>
              <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <NavLink className="btn btn-outline-light" to="/login">Login</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;