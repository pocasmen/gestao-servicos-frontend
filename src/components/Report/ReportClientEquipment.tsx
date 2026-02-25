import React from 'react';
import { Client, Equipment } from '../../types';

interface ReportClientEquipmentProps {
    clientId: number | string;
    setClientId: (val: number) => void;
    allClients: Client[];
    equipmentId: number | string;
    setEquipmentId: (val: number) => void;
    clientEquipments: Equipment[];
}

const ReportClientEquipment: React.FC<ReportClientEquipmentProps> = ({
    clientId,
    setClientId,
    allClients,
    equipmentId,
    setEquipmentId,
    clientEquipments
}) => {
    return (
        <div className="row g-2 mb-2">
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-building-fill me-2 text-primary"></i>
                        Cliente
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={clientId}
                        onChange={e => setClientId(Number(e.target.value))}
                        required
                    >
                        <option value="">Selecione um cliente...</option>
                        {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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
                        onChange={e => setEquipmentId(Number(e.target.value))}
                        required
                        disabled={!clientId}
                    >
                        <option value="">Selecione um equipamento...</option>
                        {clientEquipments.map(eq => (
                            <option key={eq.id} value={eq.id}>
                                {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`.trim()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ReportClientEquipment;
