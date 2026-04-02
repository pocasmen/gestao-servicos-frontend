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

const OVERLAY_STYLE: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
};

const CARD_STYLE: React.CSSProperties = {
    maxWidth: '800px', width: '100%', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
};

const ReservationTable: React.FC<{ rows: any[]; onOpenScheduleDetail: (id: number) => void }> = ({ rows, onOpenScheduleDetail }) => (
    <div className="table-responsive">
        <table className="table align-middle mb-0">
            <thead className="bg-dark text-white">
                <tr className="text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
                    <th className="ps-3 py-2 border-0">Serviço / Título</th>
                    <th className="py-2 border-0">Data Prevista</th>
                    <th className="py-2 border-0">Cliente</th>
                    <th className="py-2 border-0">Origem</th>
                    <th className="text-center py-2 border-0">Qtd.</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((res, index) => (
                    <tr key={index} className="border-bottom border-light">
                        <td className="ps-3 py-2">
                            <button
                                className="btn btn-link p-0 text-start text-decoration-none fw-medium"
                                style={{ fontSize: '0.9rem' }}
                                onClick={() => onOpenScheduleDetail(res.scheduleId)}
                            >
                                {res.title}
                            </button>
                        </td>
                        <td className="py-2 small text-muted">
                            {res.startDate ? new Date(res.startDate).toLocaleDateString('pt-PT') : 'Pendente'}
                        </td>
                        <td className="py-2 small">{res.clientName}</td>
                        <td className="py-2 small text-muted">
                            {res.origin || 'Direta'}
                            {res.origin && res.origin !== 'Direta' && <i className="bi bi-diagram-3 ms-1" title="Reserva via Kit"></i>}
                        </td>
                        <td className="text-center py-2 fw-bold">{res.quantityReserved}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const InventoryReservationsModal: React.FC<InventoryReservationsModalProps> = ({
    selectedPart,
    loadingReservations,
    reservations,
    onClose,
    onSync,
    onOpenScheduleDetail
}) => {
    if (!selectedPart) return null;

    const generalReservations = reservations.filter((r: any) =>
        !r.stockType || r.stockType === StockType.GENERAL || r.stockType === StockType.CONTRACT || r.stockType === StockType.MSD
    );
    const fossReservations = reservations.filter((r: any) => r.stockType === StockType.FOSS);
    const totalReserved = (selectedPart.reserved_quantity || 0) + (selectedPart.reserved_quantity_foss || 0);

    return (
        <div style={OVERLAY_STYLE}>
            <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn" style={CARD_STYLE}>
                <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                    <div>
                        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                            Itens Reservados
                        </h5>
                        <p className="text-white-50 small m-0">{selectedPart.designation}</p>
                    </div>
                    <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                </div>

                <div className="p-4" style={{ overflowY: 'auto' }}>
                    {loadingReservations ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="text-muted mt-3">A carregar reservas...</p>
                        </div>
                    ) : reservations.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-muted mb-3">Não foram encontradas reservas ativas para este item.</p>
                            {totalReserved > 0 && (
                                <div className="alert alert-warning d-inline-block text-start">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-exclamation-triangle-fill text-warning fs-4"></i>
                                        <div>
                                            <strong>Inconsistência Detetada</strong><br />
                                            O sistema indica {totalReserved} unidade(s) reservada(s), mas não existem agendamentos correspondentes.
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
                                <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                    <span className="badge bg-primary bg-opacity-15 text-primary px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>GERAL</span>
                                    Reservas de Stock Geral
                                </h6>
                                {generalReservations.length > 0 ? (
                                    <ReservationTable rows={generalReservations} onOpenScheduleDetail={onOpenScheduleDetail} />
                                ) : (
                                    <p className="text-muted fst-italic ms-2 small">Sem reservas de stock geral.</p>
                                )}
                            </div>

                            <div>
                                <h6 className="fw-bold text-info mb-3 d-flex align-items-center gap-2">
                                    <span className="badge bg-info bg-opacity-15 text-info px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>FOSS</span>
                                    Reservas de Stock Foss
                                </h6>
                                {fossReservations.length > 0 ? (
                                    <ReservationTable rows={fossReservations} onOpenScheduleDetail={onOpenScheduleDetail} />
                                ) : (
                                    <p className="text-muted fst-italic ms-2 small">Sem reservas de stock Foss.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end flex-shrink-0">
                    <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default InventoryReservationsModal;
