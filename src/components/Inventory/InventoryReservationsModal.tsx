import React from 'react';
import { Part } from '../../types';
import { StockType } from '../../constants/enums';

interface InventoryReservationsModalProps {
    selectedPart: Part | null;
    loadingReservations: boolean;
    reservations: any[];
    onClose: () => void;
    onSync: () => void;
    onOpenScheduleDetail: (scheduleId: number) => void;
}

const InventoryReservationsModal: React.FC<InventoryReservationsModalProps> = ({
    selectedPart,
    loadingReservations,
    reservations,
    onClose,
    onSync,
    onOpenScheduleDetail
}) => {
    if (!selectedPart) return null;

    return (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Itens Reservados: {selectedPart.designation}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {loadingReservations ? (
                            <p>A carregar reservas...</p>
                        ) : reservations.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="mb-3">Não foram encontradas reservas ativas para este item.</p>
                                {((selectedPart.reserved_quantity || 0) > 0 || (selectedPart.reserved_quantity_foss || 0) > 0) && (
                                    <div className="alert alert-warning d-inline-block text-start">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-exclamation-triangle-fill text-warning me-2 fs-4"></i>
                                            <div>
                                                <strong>Inconsistência Detetada</strong><br />
                                                O sistema indica {(selectedPart.reserved_quantity || 0) + (selectedPart.reserved_quantity_foss || 0)} unidade(s) reservada(s), mas não existem agendamentos correspondentes.
                                            </div>
                                        </div>
                                        <div className="mt-3 text-center">
                                            <button className="btn btn-warning btn-sm fw-bold" onClick={onSync}>
                                                <i className="bi bi-arrow-repeat me-1"></i> Corrigir Contadores
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Reservas de Stock Geral</h6>
                                    {reservations.filter((r: any) => !r.stockType || r.stockType === StockType.GENERAL || r.stockType === StockType.CONTRACT || r.stockType === StockType.MSD).length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover bg-white mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Serviço / Título</th>
                                                        <th>Data Prevista</th>
                                                        <th>Cliente</th>
                                                        <th>Origem</th>
                                                        <th className="text-center">Quantidade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reservations.filter((r: any) => !r.stockType || r.stockType === StockType.GENERAL || r.stockType === StockType.CONTRACT || r.stockType === StockType.MSD).map((res, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <button
                                                                    className="btn btn-link p-0 text-start text-decoration-none"
                                                                    style={{ verticalAlign: 'baseline', fontSize: '0.9rem' }}
                                                                    onClick={() => onOpenScheduleDetail(res.scheduleId)}
                                                                >
                                                                    {res.title}
                                                                </button>
                                                            </td>
                                                            <td style={{ fontSize: '0.9rem' }}>{new Date(res.startDate).toLocaleDateString()}</td>
                                                            <td style={{ fontSize: '0.9rem' }}>{res.clientName}</td>
                                                            <td style={{ fontSize: '0.85rem' }} className="text-muted">
                                                                {res.origin || 'Direta'}
                                                                {res.origin && res.origin !== 'Direta' && <i className="bi bi-diagram-3 ms-1" title="Reserva via Kit"></i>}
                                                            </td>
                                                            <td className="text-center fw-bold">{res.quantityReserved}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-muted fst-italic ms-2">Sem reservas de stock geral.</p>
                                    )}
                                </div>

                                <div>
                                    <h6 className="fw-bold text-info border-bottom pb-2 mb-3">Reservas de Stock Foss</h6>
                                    {reservations.filter((r: any) => r.stockType === StockType.FOSS).length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover bg-white mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Serviço / Título</th>
                                                        <th>Data Prevista</th>
                                                        <th>Cliente</th>
                                                        <th>Origem</th>
                                                        <th className="text-center">Quantidade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reservations.filter((r: any) => r.stockType === StockType.FOSS).map((res, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <button
                                                                    className="btn btn-link p-0 text-start text-decoration-none"
                                                                    style={{ verticalAlign: 'baseline', fontSize: '0.9rem' }}
                                                                    onClick={() => onOpenScheduleDetail(res.scheduleId)}
                                                                >
                                                                    {res.title}
                                                                </button>
                                                            </td>
                                                            <td style={{ fontSize: '0.9rem' }}>{new Date(res.startDate).toLocaleDateString()}</td>
                                                            <td style={{ fontSize: '0.9rem' }}>{res.clientName}</td>
                                                            <td style={{ fontSize: '0.85rem' }} className="text-muted">
                                                                {res.origin || 'Direta'}
                                                                {res.origin && res.origin !== 'Direta' && <i className="bi bi-diagram-3 ms-1" title="Reserva via Kit"></i>}
                                                            </td>
                                                            <td className="text-center fw-bold">{res.quantityReserved}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-muted fst-italic ms-2">Sem reservas de stock Foss.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryReservationsModal;
