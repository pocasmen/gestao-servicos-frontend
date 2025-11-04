import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light app-header">
      <div className="container-fluid mx-4">
        <NavLink className="navbar-brand" to="/">Gestão de Serviços</NavLink>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <NavLink className="nav-link" to="/clients">Clientes</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/equipments">Equipamentos</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/reports">Relatórios</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/technicians">Técnicos</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/calendar">Calendário</NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;