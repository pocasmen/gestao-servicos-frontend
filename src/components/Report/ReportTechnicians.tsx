import React from 'react';
import { Technician } from '../../types';

interface ReportTechniciansProps {
    allTechnicians: Technician[];
    technicianIds: string[];
    handleTechnicianChange: (id: string) => void;
}

const ReportTechnicians: React.FC<ReportTechniciansProps> = ({
    allTechnicians,
    technicianIds,
    handleTechnicianChange
}) => {
    return (
        <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3">
            <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                <i className="bi bi-people-fill me-2 text-primary opacity-50"></i>
                Técnicos Atribuídos
            </label>
            <div className="row g-3 ps-1">
                {allTechnicians.map(t => (
                    <div className="col-md-4 col-6" key={t.id}>
                        <div className="form-check custom-checkbox d-flex align-items-center">
                            <input
                                className="form-check-input shadow-none m-0 me-2"
                                type="checkbox"
                                id={`report-tech-${t.id}`}
                                value={t.id}
                                checked={technicianIds.includes(t.id)}
                                onChange={() => handleTechnicianChange(t.id)}
                                style={{ width: '1.2rem', height: '1.2rem' }}
                            />
                            <label className="form-check-label small fw-medium text-dark cursor-pointer m-0" htmlFor={`report-tech-${t.id}`}>
                                {t.name}
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportTechnicians;
