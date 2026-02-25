import React from 'react';
import { ServiceClassification, SchedulePriority, ScheduleStatus } from '../../constants/enums';
import { SERVICE_TYPES_LIST, SERVICE_CLASSIFICATIONS_LIST, SCHEDULE_PRIORITIES_LIST } from '../../constants';

interface ScheduleFormHeaderProps {
    serviceType: string;
    setServiceType: (val: string) => void;
    classification: ServiceClassification;
    setClassification: (val: ServiceClassification) => void;
    isCreating: boolean;
    sendToBacklog: boolean;
    setSendToBacklog: (val: boolean) => void;
    priority: SchedulePriority;
    setPriority: (val: SchedulePriority) => void;
    includesTravel: boolean;
    setIncludesTravel: (val: boolean) => void;
    isPastOrCompleted: boolean;
}

const ScheduleFormHeader: React.FC<ScheduleFormHeaderProps> = ({
    serviceType,
    setServiceType,
    classification,
    setClassification,
    isCreating,
    sendToBacklog,
    setSendToBacklog,
    priority,
    setPriority,
    includesTravel,
    setIncludesTravel,
    isPastOrCompleted
}) => {
    return (
        <div className="row g-2 mb-2">
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-gear-fill me-2 text-primary"></i>
                        Tipo de Serviço
                    </label>
                    <select className="form-select form-select-sm mb-2" value={serviceType} onChange={e => setServiceType(e.target.value)} disabled={isPastOrCompleted}>
                        <option value="">Selecione um tipo...</option>
                        {SERVICE_TYPES_LIST.map(type => (
                            <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                    </select>

                    {serviceType && serviceType !== 'remota' && (
                        <div className="form-check form-switch pt-1 border-top">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="includesTravel"
                                checked={includesTravel}
                                onChange={(e) => setIncludesTravel(e.target.checked)}
                                disabled={isPastOrCompleted}
                            />
                            <label className="form-check-label fw-bold text-primary small" htmlFor="includesTravel">
                                Inclui deslocação
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100 d-flex flex-column">
                    <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-tags-fill me-2 text-primary"></i>
                        Classificação
                    </label>
                    <select className="form-select form-select-sm mb-2" value={classification} onChange={e => setClassification(e.target.value as ServiceClassification)} disabled={isPastOrCompleted}>
                        {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>

                    <div className="mt-auto pt-1 border-top">
                        <div className="form-check form-switch mb-0">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="sendToBacklog"
                                checked={sendToBacklog}
                                onChange={(e) => setSendToBacklog(e.target.checked)}
                                disabled={isPastOrCompleted && !isCreating}
                            />
                            <label className="form-check-label fw-bold text-primary small" htmlFor="sendToBacklog">
                                {isCreating ? 'Pendente (Backlog)' : 'Mover para Backlog'}
                            </label>
                        </div>
                        {sendToBacklog && (
                            <div className="mt-1">
                                <select
                                    className={`form-select form-select-sm priority-select-${priority}`}
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as SchedulePriority)}
                                    disabled={isPastOrCompleted}
                                >
                                    {SCHEDULE_PRIORITIES_LIST.map(p => (
                                        <option key={p.id} value={p.id} style={{ color: p.id === 'high' ? '#dc3545' : p.id === 'medium' ? '#fd7e14' : '#0dcaf0' }}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleFormHeader;
