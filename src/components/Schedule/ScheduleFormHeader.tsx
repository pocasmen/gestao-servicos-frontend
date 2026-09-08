import React from 'react';
import { ServiceClassification, SchedulePriority, ScheduleStatus } from '../../constants/enums';
import { SERVICE_TYPES_LIST, SERVICE_CLASSIFICATIONS_LIST, SCHEDULE_PRIORITIES_LIST } from '../../constants';

interface ScheduleFormHeaderProps {
    serviceType: string[];
    setServiceType: React.Dispatch<React.SetStateAction<string[]>>;
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
    const handleServiceTypeChange = (type: string) => {
        setServiceType(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    return (
        <div className="row g-3 mb-3">
            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-gear-fill me-2 text-primary opacity-50"></i>
                        Tipo de Serviço
                    </label>
                    <div className="d-flex flex-wrap gap-3 mb-3 ps-1">
                        {SERVICE_TYPES_LIST.map(type => (
                            <div key={type.id} className="form-check mb-0 custom-checkbox">
                                <input
                                    className="form-check-input shadow-none"
                                    type="checkbox"
                                    id={`service-type-${type.id}`}
                                    checked={serviceType.includes(type.id)}
                                    onChange={() => handleServiceTypeChange(type.id)}
                                    disabled={isPastOrCompleted}
                                    style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem' }}
                                />
                                <label className="form-check-label small fw-medium text-dark ms-1 cursor-pointer" htmlFor={`service-type-${type.id}`}>
                                    {type.label}
                                </label>
                            </div>
                        ))}
                    </div>

                    {serviceType.length > 0 && !serviceType.every(t => t === 'remota') && (
                        <div className="form-check form-switch pt-2 mt-2 border-top border-light">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="includesTravel"
                                checked={includesTravel}
                                onChange={(e) => setIncludesTravel(e.target.checked)}
                                disabled={isPastOrCompleted}
                            />
                            <label className="form-check-label fw-bold text-primary small ms-1" htmlFor="includesTravel">
                                Inclui Deslocação
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 d-flex flex-column shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-tags-fill me-2 text-primary opacity-50"></i>
                        Classificação do Serviço
                    </label>
                    <select 
                        className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none mb-3" 
                        value={classification} 
                        onChange={e => setClassification(e.target.value as ServiceClassification)} 
                        disabled={isPastOrCompleted}
                    >
                        {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>

                    <div className="mt-auto pt-2 border-top border-light">
                        <div className="form-check form-switch mb-0 py-1">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="sendToBacklog"
                                checked={sendToBacklog}
                                onChange={(e) => setSendToBacklog(e.target.checked)}
                                disabled={isPastOrCompleted && !isCreating}
                            />
                            <label className="form-check-label fw-bold text-primary small ms-1" htmlFor="sendToBacklog">
                                {isCreating ? 'Pendente (Backlog)' : 'Mover para Backlog'}
                            </label>
                        </div>
                        {sendToBacklog && (
                            <div className="mt-2">
                                <select
                                    className={`form-select form-select-sm rounded-pill px-3 shadow-none border-light priority-select-${priority} fw-bold`}
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as SchedulePriority)}
                                    disabled={isPastOrCompleted}
                                >
                                    {SCHEDULE_PRIORITIES_LIST.map(p => (
                                        <option key={p.id} value={p.id}>
                                            Prioridade: {p.label}
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
