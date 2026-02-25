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
        <div className="form-group mb-2 p-2 border rounded bg-light">
            <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                <i className="bi bi-people-fill me-2 text-primary"></i>
                Técnicos Responsáveis
            </label>
            <div className="row g-2">
                {allTechnicians.map(t => (
                    <div className="col-md-4 col-6" key={t.id}>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id={`report-tech-${t.id}`}
                                value={t.id}
                                checked={technicianIds.includes(t.id)}
                                onChange={() => handleTechnicianChange(t.id)}
                            />
                            <label className="form-check-label small" htmlFor={`report-tech-${t.id}`}>
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
