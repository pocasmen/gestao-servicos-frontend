import React from 'react';
import { Link } from 'react-router-dom';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: number;
  linkTo: string;
  icon: string; // ex: 'bi bi-ticket'
  color: string; // ex: 'primary', 'success', etc.
}

const StatCard: React.FC<StatCardProps> = ({ title, value, linkTo, icon, color }) => {
  return (
    <div className={`card stat-card border-0 shadow-sm h-100 bg-gradient-${color}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="stat-icon-wrapper">
            <i className={`${icon} stat-icon`}></i>
          </div>
          <div className="text-end">
            <h2 className="stat-value">{value}</h2>
            <div className="stat-title">{title}</div>
          </div>
        </div>
        <Link to={linkTo} className="btn-stat-link">
          <span>Ver Detalhes</span>
          <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
    </div>
  );
};

export default StatCard;
