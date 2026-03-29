import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Part } from '../../types';
import { Pencil, Trash2, ArrowUpDown, Truck, Package, CalendarCheck, History, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
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
                                                    <span className={`badge border-0 px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1 ${txConfig.colorCls}`}>
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
                                                    <span className="badge bg-light text-dark border-0 rounded-pill px-2">
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
        <div className="table-responsive">
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th style={{ width: '50px' }}>Foto</th>
                        <th>Designação</th>
                        <th>Referência</th>
                        <th className="text-end">Preço</th>
                        <th className="text-center">Disp. (G)</th>
                        <th className="text-center">Disp. (F)</th>
                        <th className="text-center">Res. (G/F)</th>
                        <th className="text-center">Stock Real (G/F)</th>
                        <th className="text-center">Enc. (G/F)</th>
                        <th className="text-end pe-4">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.map(part => (
                        <React.Fragment key={part.id}>
                            {/* ── Main row ───────────────────────────────── */}
                            <tr className={expandedPartId === part.id ? 'table-active' : ''}>
                                <td className="align-middle">
                                    {part.image_path ? (
                                        <div className="inventory-photo-container d-inline-block">
                                            <img
                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`}
                                                alt={part.reference}
                                                className="inventory-photo-thumbnail rounded shadow-sm border p-1 bg-white"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=?'; }}
                                            />
                                            <div className="inventory-photo-large shadow-lg rounded overflow-hidden">
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
                                        <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted border p-1" style={{ width: '40px', height: '40px', fontSize: '10px' }}>
                                            N/A
                                        </div>
                                    )}
                                </td>
                                <td className="align-middle">
                                    {part.designation}
                                    {part.is_composed && (
                                        <span className="badge bg-primary ms-2 shadow-sm" style={{ fontSize: '0.65rem' }}>COMPOSTO</span>
                                    )}
                                </td>
                                <td className="align-middle fw-bold text-muted">{part.reference}</td>
                                <td className="align-middle text-end fw-bold text-muted">
                                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(part.price || 0)}
                                </td>
                                <td className="text-center align-middle">
                                    <span className={`badge ${(part.available_quantity ?? 0) < (part.min_stock ?? 0) ? 'bg-danger' : 'bg-success'}`}>
                                        {part.available_quantity ?? 0}
                                    </span>
                                </td>
                                <td className="text-center align-middle">
                                    <span className={`badge ${(part.available_quantity_foss ?? 0) < (part.min_stock_foss ?? 0) ? 'bg-danger' : 'bg-info'}`}>
                                        {part.available_quantity_foss ?? 0}
                                    </span>
                                </td>
                                <td className="text-center align-middle">
                                    <span className="text-muted">{part.reserved_quantity || 0}</span> / <span className="text-info">{part.reserved_quantity_foss || 0}</span>
                                </td>
                                <td className="text-center align-middle">
                                    {part.is_composed ? '-' : (
                                        <>
                                            <span className="text-muted">{part.raw_stock_quantity || 0}</span> / <span className="text-info">{part.raw_stock_foss || 0}</span>
                                        </>
                                    )}
                                </td>
                                <td className="text-center align-middle">
                                    <span className="text-muted">{part.ordered_quantity || 0}</span> / <span className="text-info">{part.ordered_quantity_foss || 0}</span>
                                </td>
                                <td className="align-middle">
                                    <div className="d-flex justify-content-end gap-1">
                                        {/* History toggle */}
                                        <button
                                            className={`btn btn-sm shadow-sm ${expandedPartId === part.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                            title="Ver Histórico de Transações"
                                            onClick={() => toggleHistory(part.id!)}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {expandedPartId === part.id ? <ChevronUp size={16} /> : <History size={16} />}
                                        </button>

                                        {!part.is_composed ? (
                                            <button
                                                className="btn btn-sm btn-secondary shadow-sm"
                                                title="Ajuste Manual de Stock"
                                                onClick={() => onOpenModal(part, 'stock')}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <ArrowUpDown size={18} />
                                            </button>
                                        ) : (
                                            <div style={{ width: '32px', height: '32px' }} />
                                        )}

                                        <button
                                            className="btn btn-sm btn-primary shadow-sm"
                                            title={part.is_composed ? 'Editar Peça/Composição' : 'Editar Item'}
                                            onClick={() => onEditItem(part)}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Pencil size={18} />
                                        </button>

                                        {!part.is_composed ? (
                                            <button
                                                className="btn btn-sm btn-warning shadow-sm"
                                                title="Registar Encomenda"
                                                onClick={() => onOpenModal(part, 'order')}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Truck size={18} />
                                            </button>
                                        ) : (
                                            <div style={{ width: '32px', height: '32px' }} />
                                        )}

                                        {!part.is_composed && ((part.ordered_quantity || 0) > 0 || (part.ordered_quantity_foss || 0) > 0) ? (
                                            <button
                                                className="btn btn-sm btn-info shadow-sm"
                                                title="Receber Encomenda"
                                                onClick={() => onOpenModal(part, 'receive')}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Package size={18} />
                                            </button>
                                        ) : (
                                            <div style={{ width: '32px', height: '32px' }} />
                                        )}

                                        {(part.reserved_quantity || 0) > 0 || (part.reserved_quantity_foss || 0) > 0 ? (
                                            <button
                                                className="btn btn-sm btn-primary shadow-sm"
                                                title="Ver Reservas"
                                                onClick={() => onViewReservations(part)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <CalendarCheck size={18} />
                                            </button>
                                        ) : (
                                            <div style={{ width: '32px', height: '32px' }} />
                                        )}

                                        <button
                                            className="btn btn-sm btn-outline-danger shadow-sm"
                                            title="Apagar Item"
                                            onClick={() => onDelete(part)}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 size={18} />
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
    );
};

export default InventoryTable;
