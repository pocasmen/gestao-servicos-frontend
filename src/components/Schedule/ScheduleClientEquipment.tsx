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
        <div className="row g-3 mb-3">
            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-building-fill me-2 text-primary opacity-50"></i>
                        Cliente
                    </label>
                    <input
                        className="form-control form-control-sm border-light bg-white rounded-pill px-3 shadow-none"
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
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-tools me-2 text-primary opacity-50"></i>
                        Equipamento
                    </label>
                    <select
                        className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none"
                        value={equipmentId}
                        onChange={e => setEquipmentId(e.target.value)}
                        required
                        disabled={isPastOrCompleted || !clientId || isLoadingEquipments}
                    >
                        <option value="">
                            {isLoadingEquipments ? 'A carregar equipamentos...' : 'Selecione um equipamento...'}
                        </option>
                        {equipments
                            .filter(eq => eq.status !== 'inactive' || String(eq.id) === String(equipmentId))
                            .map(eq => (
                                <option key={eq.id} value={String(eq.id)}>
                                    {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}${eq.nickname ? ` [${eq.nickname}]` : ''} ${eq.status === 'inactive' ? '[INATIVO]' : ''}`.trim()}
                                </option>
                            ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ScheduleClientEquipment;
