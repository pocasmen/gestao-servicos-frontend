import React from 'react';
import { Link } from 'react-router-dom';
import './StatCard.css';

interface StatDetail {
  label: string;
  value: number | string;
  colorClass?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  linkTo?: string;
  icon: string;
  color: string;
  details?: StatDetail[];
  extra?: React.ReactNode;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, linkTo, icon, color, details, extra, onClick }) => {
  return (
    <div className={`card stat-card border-0 shadow-sm h-100 bg-gradient-${color}`}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="stat-icon-wrapper">
            <i className={`${icon} stat-icon`}></i>
          </div>
          <div className="text-end">
            <h2 className="stat-value mb-0">{value}</h2>
            <div className="stat-title opacity-75">{title}</div>
          </div>
        </div>

        {details && details.length > 0 && (
          <div className="stat-details mt-2 mb-3 pt-2 border-top border-white border-opacity-10">
            {details.map((detail, idx) => (
              <div key={idx} className="d-flex justify-content-between align-items-center small mb-1">
                <div className="d-flex align-items-center gap-2">
                  {detail.colorClass && <span className={`dot ${detail.colorClass}`}></span>}
                  <span className="opacity-75">{detail.label}:</span>
                </div>
                <span className="fw-bold">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
        {extra && <div className="stat-extra mb-3">{extra}</div>}

        <div className="mt-auto">
          {onClick ? (
            <button onClick={onClick} className="btn-stat-link w-100 justify-content-between border-0" style={{ cursor: 'pointer' }}>
              <span>Ver Detalhes</span>
              <i className="bi bi-chevron-down"></i>
            </button>
          ) : (
            <Link to={linkTo || '#'} className="btn-stat-link">
              <span>Ver Detalhes</span>
              <i className="bi bi-arrow-right"></i>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
