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
        <div className="row g-3 mb-3">
            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-50 border rounded-4 h-100 shadow-sm border-light">
                    <label className="text-muted fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-building-fill me-2 text-primary opacity-50"></i>
                        Cliente
                    </label>
                    <select
                        className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
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
                <div className="p-3 bg-white bg-opacity-50 border rounded-4 h-100 shadow-sm border-light">
                    <label className="text-muted fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-tools me-2 text-primary opacity-50"></i>
                        Equipamento
                    </label>
                    <select
                        className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
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
