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
        <div className="row mb-3">
            <div className="col-md-6">
                <div className="form-group">
                    <label className="text-secondary fw-bold">Cliente</label>
                    <input
                        className="form-control"
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
                <div className="form-group">
                    <label className="text-secondary fw-bold">Equipamento</label>
                    <select
                        className="form-control"
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
