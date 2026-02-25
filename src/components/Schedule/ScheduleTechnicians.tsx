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
        <div className="form-group mb-3">
            <label className="text-secondary fw-bold">Técnico(s)</label>
            <div className="technician-checkbox-group p-2 border rounded">
                <div className="row">
                    {technicians.length === 0 ? (
                        <div className="col-12"><small className="text-muted">Nenhum técnico/admin disponível.</small></div>
                    ) : (
                        technicians.map(t => (
                            <div className="col-4" key={t.id}>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`tech-${t.id}`}
                                        value={t.id}
                                        checked={technicianIds.includes(String(t.id))}
                                        onChange={() => handleTechnicianChange(String(t.id))}
                                        disabled={isPastOrCompleted}
                                    />
                                    <label className="form-check-label" htmlFor={`tech-${t.id}`}>
                                        {t.name}
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleTechnicians;
