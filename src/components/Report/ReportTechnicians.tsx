import React from 'react';
import { Technician } from '../../types';
import { UserRole } from '../../constants/enums';

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
    // Show all active technicians, PLUS inactive technicians that are already associated with this report
    const visibleTechnicians = allTechnicians.filter(t => 
        t.role !== UserRole.INACTIVE_TECHNICIAN || technicianIds.includes(t.id)
    );

    return (
        <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3">
            <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                <i className="bi bi-people-fill me-2 text-primary opacity-50"></i>
                Técnicos Atribuídos
            </label>
            <div className="row g-3 ps-1">
                {visibleTechnicians.map(t => {
                    const isInactive = t.role === UserRole.INACTIVE_TECHNICIAN;
                    return (
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
                                <label className={`form-check-label small fw-medium ${isInactive ? 'text-muted' : 'text-dark'} cursor-pointer m-0`} htmlFor={`report-tech-${t.id}`}>
                                    {t.name}
                                    {isInactive && (
                                        <span className="badge bg-secondary bg-opacity-25 text-secondary ms-1 py-0 px-1" style={{ fontSize: '0.7rem' }}>
                                            Inativo
                                        </span>
                                    )}
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReportTechnicians;
