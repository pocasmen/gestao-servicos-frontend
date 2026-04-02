import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Part } from '../../types';
import { Pencil, Trash2, ArrowUpDown, Truck, Package, CalendarCheck, History, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import apiClient from '../../apiClient';
import './InventoryTable.css';
import { format } from 'date-fns';

// ─── Transaction type config ─────────────────────────────────────────────────
const TX_TYPE: Record<string, { label: string; colorCls: string; icon: React.ReactNode }> = {
    PURCHASE_ORDER: { label: 'Encomenda',    colorCls: 'bg-success bg-opacity-10 text-success', icon: <Truck size={13} /> },
    AD_HOC:         { label: 'Ad-hoc',       colorCls: 'bg-primary bg-opacity-10 text-primary', icon: <TrendingUp size={13} /> },
    SERVICE_REPORT: { label: 'Relatório',    colorCls: 'bg-danger bg-opacity-10 text-danger',   icon: <TrendingDown size={13} /> },
    DIRECT_SALE:    { label: 'Venda Direta', colorCls: 'bg-warning bg-opacity-10 text-warning', icon: <TrendingDown size={13} /> },
    MANUAL_ADJUST:  { label: 'Ajuste',       colorCls: 'bg-secondary bg-opacity-10 text-secondary', icon: null },
};

// ─── Inline history panel ─────────────────────────────────────────────────────
const PartHistoryPanel: React.FC<{ partId: number; colSpan: number; onOpenDoc?: (tx: any) => void }> = ({ partId, colSpan, onOpenDoc }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['part_history', partId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/inventory/${partId}/history`);
            return res.data as any[];
        },
        staleTime: 30_000,
    });

    return (
        <tr className="history-panel-row" style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.04), rgba(79,70,229,0.01))' }}>
            <td colSpan={colSpan} className="p-0">
                <div className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <History size={16} className="text-primary opacity-75" />
                        <span className="fw-bold small text-uppercase text-muted" style={{ letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                            Histórico de Transações
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="d-flex align-items-center gap-2 py-2 text-muted small">
                            <span className="spinner-border spinner-border-sm text-primary" />
                            A carregar histórico...
                        </div>
                    ) : !data || data.length === 0 ? (
                        <div className="text-center py-3 text-muted small fst-italic opacity-75">
                            Nenhuma transação registada para esta peça.
                        </div>
                    ) : (
                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                            <table className="table table-sm mb-0 align-middle" style={{ fontSize: '0.82rem' }}>
                                <thead className="sticky-top" style={{ background: 'rgba(248,250,252,0.95)' }}>
                                    <tr className="text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                        <th className="fw-bold py-2 border-0">Data</th>
                                        <th className="fw-bold py-2 border-0">Tipo</th>
                                        <th className="fw-bold py-2 border-0 text-center">Qtd</th>
                                        <th className="fw-bold py-2 border-0">Stock</th>
                                        <th className="fw-bold py-2 border-0 text-center">Saldo</th>
                                        <th className="fw-bold py-2 border-0">Nº Doc</th>
                                        <th className="fw-bold py-2 border-0">Utilizador</th>
                                        <th className="fw-bold py-2 border-0">Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((tx: any, i: number) => {
                                        const txConfig = TX_TYPE[tx.type] ?? { label: tx.type, colorCls: 'bg-secondary bg-opacity-10 text-secondary', icon: null };
                                        const isPositive = tx.quantity > 0;
                                        return (
                                            <tr key={tx.id ?? i} className="border-bottom border-light">
                                                <td className="py-2 text-nowrap text-muted" style={{ minWidth: '130px' }}>
                                                    {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                                                </td>
                                                <td className="py-2">
                                                    <span className={`fw-bold small d-inline-flex align-items-center gap-1 ${txConfig.colorCls.replace('bg-', 'text-').replace(' bg-opacity-10', '')}`}>
                                                        {txConfig.icon}
                                                        {txConfig.label}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-center fw-bold" style={{ minWidth: '60px' }}>
                                                    <span className={isPositive ? 'text-success' : 'text-danger'}>
                                                        {isPositive ? '+' : ''}{tx.quantity}
                                                    </span>
                                                </td>
                                                <td className="py-2">
                                                    <span className="fw-bold text-muted small">
                                                        {tx.stock_type === 'contract' ? 'FOSS/Contrato' : 'Geral'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-center fw-bold text-muted">
                                                    {tx.running_stock}
                                                </td>
                                                <td className="py-2 text-muted small">
                                                    {tx.reference_id ? (
                                                        <button 
                                                            className="btn btn-link p-0 text-decoration-none small d-flex align-items-center gap-1"
                                                            onClick={() => onOpenDoc?.(tx)}
                                                        >
                                                            <Package size={12} className="text-primary" />
                                                            <span className="text-truncate" style={{ maxWidth: '80px' }}>#{tx.reference_id}</span>
                                                        </button>
                                                    ) : '—'}
                                                </td>
                                                <td className="py-2 text-muted small text-nowrap">
                                                    {tx.first_name ? `${tx.first_name} ${tx.last_name || ''}`.trim() : '—'}
                                                </td>
                                                <td className="py-2 text-muted small" style={{ maxWidth: '220px' }}>
                                                    <span title={tx.notes ?? ''} className="d-inline-block text-truncate" style={{ maxWidth: '200px' }}>
                                                        {tx.notes || '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ─── Main Table Component ─────────────────────────────────────────────────────
interface InventoryTableProps {
    inventory: Part[];
    onOpenModal: (part: Part, type: 'stock' | 'order' | 'receive') => void;
    onEditItem: (part: Part) => void;
    onViewReservations: (part: Part) => void;
    onDelete: (part: Part) => void;
    onOpenDoc?: (tx: any) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
    inventory,
    onOpenModal,
    onEditItem,
    onViewReservations,
    onDelete,
    onOpenDoc
}) => {
    const [expandedPartId, setExpandedPartId] = useState<number | null>(null);

    const toggleHistory = (partId: number) => {
        setExpandedPartId(prev => prev === partId ? null : partId);
    };

    const TOTAL_COLS = 11; // foto + 8 data cols + ações + 1 for history

    return (
        <div className="glass-card border-0 shadow-sm overflow-hidden animate__animated animate__fadeIn rounded-4 mb-4">
            <div className="table-responsive">
                <table className="table align-middle mb-0">
                    <thead className="bg-dark text-white">
                        <tr className="text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
                            <th className="ps-4 py-3 border-0" style={{ width: '80px' }}>Item</th>
                            <th className="py-3 border-0">Designação / Referência</th>
                            <th className="text-end py-3 border-0">Preço</th>
                            <th className="text-center py-3 border-0">Disponível</th>
                            <th className="text-center py-3 border-0">Reserva</th>
                            <th className="text-center py-3 border-0">Stock Real</th>
                            <th className="text-center py-3 border-0">Enc.</th>
                            <th className="text-end pe-4 py-3 border-0">Ações</th>
                        </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                        {inventory.map(part => (
                            <React.Fragment key={part.id}>
                                {/* ── Main row ───────────────────────────────── */}
                                <tr className={`${expandedPartId === part.id ? 'bg-primary bg-opacity-10' : ''} shadow-sm border-bottom border-light`}>
                                    <td className="ps-4 py-3">
                                        {part.image_path ? (
                                            <div className="inventory-photo-container d-inline-block">
                                                <img
                                                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`}
                                                    alt={part.reference}
                                                    className="inventory-photo-thumbnail rounded-3 shadow-sm border p-1 bg-white"
                                                    style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/48x48?text=?'; }}
                                                />
                                                <div className="inventory-photo-large shadow-lg rounded-4 overflow-hidden">
                                                    <img
                                                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`}
                                                        alt={`${part.reference} - Large Preview`}
                                                        className="w-100 h-100"
                                                        style={{ objectFit: 'contain', backgroundColor: '#fff' }}
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-light rounded-3 d-flex align-items-center justify-content-center text-muted border p-1 shadow-sm" style={{ width: '48px', height: '48px', fontSize: '12px', fontWeight: 'bold' }}>
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="fw-bold text-dark">{part.designation}</div>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <span className="small fw-bold text-muted font-monospace">{part.reference}</span>
                                            {part.is_composed && (
                                                <span className="small fw-bold text-primary" style={{ fontSize: '0.75rem' }}>[KIT]</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-end fw-bold text-primary pe-3">
                                        {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(part.price || 0)}
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex flex-column align-items-center gap-1">
                                            <span className={`small fw-bold ${(part.available_quantity ?? 0) < (part.min_stock ?? 0) ? 'text-danger' : 'text-success'}`}>
                                                {part.available_quantity ?? 0} <span className="opacity-75 ms-1" style={{ fontSize: '0.7rem' }}>G</span>
                                            </span>
                                            <span className={`small fw-bold ${(part.available_quantity_foss ?? 0) < (part.min_stock_foss ?? 0) ? 'text-danger' : 'text-info'}`}>
                                                {part.available_quantity_foss ?? 0} <span className="opacity-75 ms-1" style={{ fontSize: '0.7rem' }}>F</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex flex-column align-items-center gap-1">
                                            <span className="small fw-bold text-muted">{part.reserved_quantity || 0}</span>
                                            <span className="small fw-bold text-info">{part.reserved_quantity_foss || 0}</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        {part.is_composed ? (
                                            <span className="text-muted opacity-50">—</span>
                                        ) : (
                                            <div className="d-flex flex-column align-items-center gap-1">
                                                <span className="small fw-bold text-muted">{part.raw_stock_quantity || 0}</span>
                                                <span className="small fw-bold text-info">{part.raw_stock_foss || 0}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex flex-column align-items-center gap-1">
                                            <span className="small fw-bold text-muted">{part.ordered_quantity || 0}</span>
                                            <span className="small fw-bold text-info">{part.ordered_quantity_foss || 0}</span>
                                        </div>
                                    </td>
                                    <td className="pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            <button
                                                className={`btn btn-icon rounded-circle shadow-sm transition-all ${expandedPartId === part.id ? 'btn-primary shadow-sm' : 'btn-outline-primary border-2'}`}
                                                onClick={() => toggleHistory(part.id!)}
                                                title="Histórico de Stock"
                                            >
                                                {expandedPartId === part.id ? <ChevronUp size={18} strokeWidth={2.5} /> : <History size={18} strokeWidth={2.5} />}
                                            </button>

                                            {!part.is_composed && (
                                                <button
                                                    className="btn btn-icon btn-outline-secondary rounded-circle shadow-sm transition-all border-2"
                                                    onClick={() => onOpenModal(part, 'stock')}
                                                    title="Ajuste de Stock"
                                                >
                                                    <ArrowUpDown size={18} strokeWidth={2.5} />
                                                </button>
                                            )}

                                            <button
                                                className="btn btn-icon btn-outline-primary rounded-circle shadow-sm transition-all border-2"
                                                onClick={() => onEditItem(part)}
                                                title="Editar"
                                            >
                                                <Pencil size={18} strokeWidth={2.5} />
                                            </button>

                                            {!part.is_composed && (
                                                <button
                                                    className="btn btn-icon btn-outline-warning rounded-circle shadow-sm transition-all border-2"
                                                    onClick={() => onOpenModal(part, 'order')}
                                                    title="Encomendar"
                                                >
                                                    <Truck size={18} strokeWidth={2.5} />
                                                </button>
                                            )}

                                            {!part.is_composed && ((part.ordered_quantity || 0) > 0 || (part.ordered_quantity_foss || 0) > 0) && (
                                                <button
                                                    className="btn btn-icon btn-outline-info rounded-circle shadow-sm transition-all border-2"
                                                    onClick={() => onOpenModal(part, 'receive')}
                                                    title="Receber Encomenda"
                                                >
                                                    <Package size={18} strokeWidth={2.5} />
                                                </button>
                                            )}

                                            {((part.reserved_quantity || 0) > 0 || (part.reserved_quantity_foss || 0) > 0) && (
                                                <button
                                                    className="btn btn-icon btn-outline-success rounded-circle shadow-sm transition-all border-2"
                                                    onClick={() => onViewReservations(part)}
                                                    title="Ver Reservas"
                                                >
                                                    <CalendarCheck size={18} strokeWidth={2.5} />
                                                </button>
                                            )}

                                            <button
                                                className="btn btn-icon btn-outline-danger rounded-circle shadow-sm transition-all border-2"
                                                onClick={() => onDelete(part)}
                                                title="Apagar"
                                            >
                                                <Trash2 size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* ── Inline history panel ───────────────────── */}
                                {expandedPartId === part.id && (
                                    <PartHistoryPanel 
                                        partId={part.id!} 
                                        colSpan={TOTAL_COLS} 
                                        onOpenDoc={onOpenDoc}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryTable;
