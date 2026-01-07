import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AuthContext } from '../App';

const ClientPortalHeader: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) {
    return null;
  }
  
  const clientName = user.user_metadata?.clientName || 'Portal do Cliente';
  const userFirstName = user.user_metadata?.first_name || '';
  const userLastName = user.user_metadata?.last_name || '';

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4 border-bottom">
      <div className="container-fluid">
        <span className="navbar-brand">
          {clientName}
        </span>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#portalNav" aria-controls="portalNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="portalNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/portal/tickets">Tickets</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/portal/schedules">Agendamentos</NavLink>
            </li>
          </ul>
          <div className="d-flex align-items-center">
            <span className="navbar-text me-3">
              Utilizador: {userFirstName} {userLastName}
            </span>
            <button className="btn btn-outline-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ClientPortalHeader;
