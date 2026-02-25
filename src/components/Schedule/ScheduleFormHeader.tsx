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
        <>
            <div className="row mb-3">
                <div className="col-md-6">
                    <div className="form-group">
                        <label className="text-secondary fw-bold">Tipo de Serviço</label>
                        <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} disabled={isPastOrCompleted}>
                            <option value="">Selecione um tipo...</option>
                            {SERVICE_TYPES_LIST.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="form-group">
                        <label className="text-secondary fw-bold">Classificação</label>
                        <select className="form-control" value={classification} onChange={e => setClassification(e.target.value as ServiceClassification)} disabled={isPastOrCompleted}>
                            {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                                <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="form-group mb-3">
                <div className="form-check form-switch border p-2 rounded bg-light">
                    <input
                        className="form-check-input ms-0 me-2"
                        type="checkbox"
                        id="sendToBacklog"
                        checked={sendToBacklog}
                        onChange={(e) => setSendToBacklog(e.target.checked)}
                        disabled={isPastOrCompleted && !isCreating}
                    />
                    <label className="form-check-label fw-bold text-primary" htmlFor="sendToBacklog">
                        {isCreating ? 'Pendente de Agendamento (Backlog)' : 'Mover para Backlog (Remover Datas)'}
                    </label>
                    <div className="small text-muted ms-4">
                        {isCreating
                            ? 'O serviço será guardado sem data definida e aparecerá na barra lateral para agendamento posterior.'
                            : 'Remove as datas deste agendamento e move-o para a lista de pendentes.'}
                    </div>
                </div>
            </div>

            {sendToBacklog && (
                <div className="form-group mb-3">
                    <label className="text-secondary fw-bold">Prioridade do Backlog</label>
                    <select
                        className={`form-select priority-select-${priority}`}
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
            <style>{`
                .priority-select-high { color: #dc3545 !important; font-weight: bold; }
                .priority-select-medium { color: #fd7e14 !important; font-weight: bold; }
                .priority-select-low { color: #0dcaf0 !important; font-weight: bold; }
            `}</style>

            {serviceType && serviceType !== 'remota' && (
                <div className="form-group mb-3">
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="includesTravel"
                            checked={includesTravel}
                            onChange={(e) => setIncludesTravel(e.target.checked)}
                            disabled={isPastOrCompleted}
                        />
                        <label className="form-check-label" htmlFor="includesTravel">
                            Inclui deslocação às instalações do cliente
                        </label>
                    </div>
                </div>
            )}
        </>
    );
};

export default ScheduleFormHeader;
