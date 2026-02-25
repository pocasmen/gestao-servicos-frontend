import React from 'react';
import { Client, Equipment } from '../../types';

interface ScheduleClientEquipmentProps {
    clientSearch: string;
    setClientSearch: (val: string) => void;
    clients: Client[];
    equipmentId: string;
    setEquipmentId: (val: string) => void;
    equipments: Equipment[];
    isLoadingEquipments: boolean;
    clientId: string;
    isPastOrCompleted: boolean;
}

const ScheduleClientEquipment: React.FC<ScheduleClientEquipmentProps> = ({
    clientSearch,
    setClientSearch,
    clients,
    equipmentId,
    setEquipmentId,
    equipments,
    isLoadingEquipments,
    clientId,
    isPastOrCompleted
}) => {
    return (
        <div className="row g-2 mb-2">
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-building-fill me-2 text-primary"></i>
                        Cliente
                    </label>
                    <input
                        className="form-control form-control-sm"
                        list="clientOptions"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        placeholder="Pesquisar cliente..."
                        required
                        disabled={isPastOrCompleted}
                    />
                    <datalist id="clientOptions">
                        {clients.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                </div>
            </div>
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-pc-display me-2 text-primary"></i>
                        Equipamento
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={equipmentId}
                        onChange={e => setEquipmentId(e.target.value)}
                        required
                        disabled={isPastOrCompleted || !clientId || isLoadingEquipments}
                    >
                        <option value="">
                            {isLoadingEquipments ? 'A carregar equipamentos...' : 'Selecione um equipamento...'}
                        </option>
                        {equipments.map(eq => (
                            <option key={eq.id} value={String(eq.id)}>
                                {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`.trim()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ScheduleClientEquipment;
