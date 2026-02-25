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
        <div className="form-group mb-3">
            <label className="text-secondary fw-bold">Técnico(s) Responsável(eis)</label>
            <div className="technician-checkbox-group p-2 border rounded bg-light">
                <div className="row">
                    {allTechnicians.map(t => (
                        <div className="col-4" key={t.id}>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`report-tech-${t.id}`}
                                    value={t.id}
                                    checked={technicianIds.includes(t.id)}
                                    onChange={() => handleTechnicianChange(t.id)}
                                />
                                <label className="form-check-label" htmlFor={`report-tech-${t.id}`}>
                                    {t.name}
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportTechnicians;
