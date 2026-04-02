import React from 'react';
import { Technician } from '../../types';

interface ScheduleTechniciansProps {
    technicians: Technician[];
    technicianIds: string[];
    handleTechnicianChange: (id: string) => void;
    isPastOrCompleted: boolean;
}

const ScheduleTechnicians: React.FC<ScheduleTechniciansProps> = ({
    technicians,
    technicianIds,
    handleTechnicianChange,
    isPastOrCompleted
}) => {
    return (
        <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3">
            <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                <i className="bi bi-people-fill me-2 text-primary opacity-50"></i>
                Técnicos Atribuídos
            </label>
            <div className="row g-3 ps-1">
                {technicians.length === 0 ? (
                    <div className="col-12 text-center py-2 px-3 bg-light rounded-4 border border-dashed">
                        <small className="text-muted fw-bold">Nenhum técnico disponível.</small>
                    </div>
                ) : (
                    technicians.map(t => (
                        <div className="col-md-4 col-6" key={t.id}>
                            <div className="form-check custom-checkbox">
                                <input
                                    className="form-check-input shadow-none"
                                    type="checkbox"
                                    id={`tech-${t.id}`}
                                    value={t.id}
                                    checked={technicianIds.includes(String(t.id))}
                                    onChange={() => handleTechnicianChange(String(t.id))}
                                    disabled={isPastOrCompleted}
                                    style={{ width: '1.2rem', height: '1.2rem' }}
                                />
                                <label className="form-check-label small fw-medium text-dark ms-1 cursor-pointer" htmlFor={`tech-${t.id}`}>
                                    {t.name}
                                </label>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ScheduleTechnicians;
