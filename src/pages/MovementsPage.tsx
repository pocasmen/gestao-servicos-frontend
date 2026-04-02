import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  History, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Calendar, 
  User, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import apiClient from '../apiClient';
import logger from '../utils/logger';
import { useConfirm } from '../contexts/ConfirmContext';

// Components
import ReportModal from '../components/ReportModal';
import OrderDetailsModal from '../components/Inventory/OrderDetailsModal';
import InventoryItemForm, { ComponentItem } from '../components/Inventory/InventoryItemForm';

// Types
import { Part } from '../types';
import { StockType } from '../constants/enums';

// ─── Transaction type config ─────────────────────────────────────────────────
const TX_TYPE: Record<string, { label: string; colorCls: string; icon: React.ReactNode }> = {
    PURCHASE_ORDER: { label: 'Encomenda',    colorCls: 'bg-success bg-opacity-10 text-success', icon: <TrendingUp size={14} /> },
    AD_HOC:         { label: 'Ad-hoc',       colorCls: 'bg-primary bg-opacity-10 text-primary', icon: <TrendingUp size={14} /> },
    SERVICE_REPORT: { label: 'Relatório',    colorCls: 'bg-danger bg-opacity-10 text-danger',   icon: <TrendingDown size={14} /> },
    DIRECT_SALE:    { label: 'Venda Direta', colorCls: 'bg-warning bg-opacity-10 text-warning', icon: <TrendingDown size={14} /> },
    MANUAL_ADJUST:  { label: 'Ajuste',       colorCls: 'bg-secondary bg-opacity-10 text-secondary', icon: null },
};

const MovementsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    
    const [page, setPage] = useState(1);
    const limit = 50;

    // Modal States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
    
    // Part Edit State (Simplified version of InventoryPage logic)
    const [newItem, setNewItem] = useState<Omit<Part, 'id'> & { id?: number }>({
        reference: '',
        designation: '',
        stock_quantity: 0,
        reserved_quantity: 0,
        ordered_quantity: 0,
        stock_quantity_foss: 0,
        reserved_quantity_foss: 0,
        ordered_quantity_foss: 0,
        min_stock: 0,
        min_stock_foss: 0,
        price: 0,
        notes: ''
    });
    const [isComposed, setIsComposed] = useState(false);
    const [components, setComponents] = useState<ComponentItem[]>([]);
    const [compSearch, setCompSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: movementsData, isLoading, isError } = useQuery({
        queryKey: ['inventory_movements', page],
        queryFn: async () => {
            const res = await apiClient.get(`/api/inventory/transactions?page=${page}&limit=${limit}`);
            return res.data;
        }
    });

    const [compSearchResults, setCompSearchResults] = useState<Part[]>([]);
    const [showCompResults, setShowCompResults] = useState(false);

    const handleCompSearch = async (query: string) => {
        setCompSearch(query);
        if (query.length < 2) {
            setCompSearchResults([]);
            setShowCompResults(false);
            return;
        }
        try {
            const res = await apiClient.get(`/api/inventory?search=${query}&limit=5`);
            setCompSearchResults(res.data.data || []);
            setShowCompResults(true);
        } catch (err) {
            logger.error(err, 'Error searching components:');
        }
    };

    const addComponent = (part: Part) => {
        if (components.some(c => c.partId === part.id)) return;
        setComponents([...components, { partId: part.id as number, quantity: 1, reference: part.reference, designation: part.designation }]);
        setShowCompResults(false);
        setCompSearch('');
    };

    const removeComponent = (partId: number) => {
        setComponents(components.filter(c => c.partId !== partId));
    };

    const updateComponentQty = (partId: number, qty: number) => {
        setComponents(components.map(c => c.partId === partId ? { ...c, quantity: Math.max(1, qty) } : c));
    };

    const movements = movementsData?.data || [];
    const pagination = movementsData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

    // Handlers
    const handleOpenDoc = async (tx: any) => {
        if (!tx.reference_id) return;
        
        if (tx.type === 'SERVICE_REPORT' || tx.type === 'SERVICE') {
            try {
                // Verify existence first
                await apiClient.get(`/api/reports/${tx.reference_id}`);
                setSelectedReport({ id: parseInt(tx.reference_id) });
                setIsReportModalOpen(true);
            } catch (err: any) {
                if (err.response?.status === 404) {
                    alert('Este relatório já não existe ou foi eliminado.');
                } else {
                    alert('Erro ao carregar relatório.');
                    logger.error(err, 'Error verifying report existence:');
                }
            }
        } else if (tx.type === 'PURCHASE_ORDER') {
            try {
                // Verify existence first
                await apiClient.get(`/api/inventory/orders/${tx.reference_id}`);
                setSelectedOrderId(parseInt(tx.reference_id));
                setIsOrderModalOpen(true);
            } catch (err: any) {
                if (err.response?.status === 404) {
                    alert('Esta encomenda já não existe ou foi eliminada.');
                } else {
                    alert('Erro ao carregar encomenda.');
                    logger.error(err, 'Error verifying order existence:');
                }
            }
        }
    };

    const handleEditPart = async (partId: number) => {
        try {
            const res = await apiClient.get(`/api/inventory/${partId}`);
            const part = res.data;
            setSelectedPartId(partId);
            setNewItem(part);
            setIsComposed(!!part.is_composed);
            setComponents(part.components || []);
            setIsPartModalOpen(true);
        } catch (err) {
            logger.error(err, 'Error fetching part details:');
            alert('Erro ao carregar detalhes da peça.');
        }
    };

    const handleUpdatePart = async () => {
        if (!selectedPartId) return;
        setIsSubmitting(true);
        try {
            await apiClient.put(`/api/inventory/parts/${selectedPartId}`, {
                ...newItem,
                is_composed: isComposed,
                components: isComposed ? components : []
            });
            queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
            setIsPartModalOpen(false);
            setSelectedPartId(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao atualizar peça.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-4" style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 100px)' }}>
            {/* Header section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#0f172a', fontFamily: 'Montserrat, sans-serif' }}>
                        Movimentos de Inventário
                    </h2>
                    <p className="text-muted small mb-0">Histórico completo de entradas e saídas de stock</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="bg-white p-2 rounded-pill shadow-sm d-flex align-items-center px-3 border border-light">
                        <History size={18} className="text-primary me-2" />
                        <span className="fw-bold text-primary small">{pagination.total} <span className="fw-normal opacity-75">movimentos</span></span>
                    </div>
                </div>
            </div>

            {/* Main card */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                {/* Table section */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr style={{ backgroundColor: '#fdfdfd' }}>
                                <th className="ps-4 py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Data</th>
                                <th className="py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Peça / Referência</th>
                                <th className="py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Tipo</th>
                                <th className="py-3 border-0 text-uppercase text-muted text-center" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Qtd</th>
                                <th className="py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Stock</th>
                                <th className="py-3 border-0 text-uppercase text-muted text-center" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Saldo</th>
                                <th className="py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Nº Doc</th>
                                <th className="py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Utilizador</th>
                                <th className="pe-4 py-3 border-0 text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
                                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                                        <span className="text-muted small">A carregar movimentos...</span>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5 text-danger small">
                                        Erro ao carregar movimentos. Por favor, tente novamente.
                                    </td>
                                </tr>
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5 text-muted small fst-italic">
                                        Nenhum movimento registado.
                                    </td>
                                </tr>
                            ) : (
                                movements.map((tx: any) => {
                                    const txConfig = TX_TYPE[tx.type] ?? { label: tx.type, colorCls: 'bg-secondary bg-opacity-10 text-secondary', icon: null };
                                    const isPositive = tx.quantity > 0;
                                    
                                    return (
                                        <tr key={tx.id} className="border-bottom border-light">
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="bg-light p-1 rounded">
                                                        <Calendar size={14} className="text-muted" />
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem' }}>
                                                        <div className="fw-semibold text-dark">{format(new Date(tx.created_at), 'dd/MM/yyyy')}</div>
                                                        <div className="text-muted small">{format(new Date(tx.created_at), 'HH:mm')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div 
                                                    style={{ fontSize: '0.85rem', cursor: 'pointer' }} 
                                                    className="hover-opacity"
                                                    onClick={() => handleEditPart(tx.part_id)}
                                                >
                                                    <div className="fw-bold text-dark text-decoration-underline-hover">{tx.designation}</div>
                                                    <div className="text-muted small font-monospace">{tx.reference}</div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className={`badge border-0 px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2 ${txConfig.colorCls}`} style={{ fontSize: '0.75rem' }}>
                                                    {txConfig.icon}
                                                    {txConfig.label}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center fw-bold" style={{ fontSize: '0.95rem' }}>
                                                <span className={isPositive ? 'text-success' : 'text-danger'}>
                                                    {isPositive ? '+' : ''}{tx.quantity}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className="badge bg-light text-dark border-0 rounded-pill px-3 py-2 fw-medium" style={{ fontSize: '0.72rem' }}>
                                                    {tx.stock_type === 'contract' ? 'FOSS/Contrato' : 'Geral'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center fw-bold text-muted" style={{ fontSize: '0.9rem' }}>
                                                {tx.running_stock}
                                            </td>
                                            <td className="py-3">
                                                {tx.reference_id ? (
                                                    <button 
                                                        className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-primary fw-medium small text-decoration-none"
                                                        onClick={() => handleOpenDoc(tx)}
                                                    >
                                                        <FileText size={12} /> {tx.reference_id}
                                                    </button>
                                                ) : <span className="text-muted opacity-50">—</span>}
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center gap-2 small fw-medium text-dark">
                                                    <div className="bg-light p-1 rounded-circle">
                                                        <User size={12} className="text-muted" />
                                                    </div>
                                                    {tx.first_name ? `${tx.first_name} ${tx.last_name || ''}`.trim() : <span className="text-muted">Desconhecido</span>}
                                                </div>
                                            </td>
                                            <td className="pe-4 py-3">
                                                <div className="text-muted small text-truncate" style={{ maxWidth: '180px' }} title={tx.notes || ''}>
                                                    {tx.notes || <span className="opacity-50">—</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 d-flex justify-content-between align-items-center border-top border-light bg-light bg-opacity-10">
                        <div className="text-muted small">
                            Mostrando <span className="fw-semibold">{(page-1)*limit + 1}</span> a <span className="fw-semibold">{Math.min(page*limit, pagination.total)}</span> de <span className="fw-semibold">{pagination.total}</span> resultados
                        </div>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-sm btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-1 fw-semibold small"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={14} /> Anterior
                            </button>
                            <div className="d-flex gap-1">
                                {[...Array(pagination.totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    // Only show current, 2 before, 2 after
                                    if (p === 1 || p === pagination.totalPages || (p >= page - 2 && p <= page + 2)) {
                                        return (
                                            <button 
                                                key={p}
                                                className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center fw-bold ${page === p ? 'btn-primary' : 'btn-white border shadow-sm text-muted'}`}
                                                style={{ width: '30px', height: '30px', fontSize: '0.75rem' }}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    if (p === page - 3 || p === page + 3) return <span key={p} className="text-muted align-self-end small">...</span>;
                                    return null;
                                })}
                            </div>
                            <button 
                                className="btn btn-sm btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-1 fw-semibold small"
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                            >
                                Próximo <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isReportModalOpen && selectedReport && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reportToEdit={selectedReport}
                    schedule={null}
                    onReportSaved={() => queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })}
                />
            )}

            {isOrderModalOpen && selectedOrderId && (
                <OrderDetailsModal
                    isOpen={isOrderModalOpen}
                    orderId={selectedOrderId}
                    onClose={() => setIsOrderModalOpen(false)}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })}
                />
            )}

            {isPartModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn w-100" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Editar Item de Inventário</h5>
                            <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setIsPartModalOpen(false)}></button>
                        </div>
                        <div className="p-4" style={{ overflowY: 'auto' }}>
                            <InventoryItemForm
                                newItem={newItem}
                                setNewItem={setNewItem}
                                isComposed={isComposed}
                                setIsComposed={setIsComposed}
                                components={components}
                                compSearch={compSearch}
                                setCompSearch={setCompSearch}
                                handleCompSearch={handleCompSearch}
                                compSearchResults={compSearchResults}
                                showCompResults={showCompResults}
                                addComponent={addComponent}
                                removeComponent={removeComponent}
                                updateComponentQty={updateComponentQty}
                                isSubmitting={isSubmitting}
                                onClose={() => setIsPartModalOpen(false)}
                                onSubmit={handleUpdatePart}
                                isInline={true}
                            />
                        </div>
                        <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2 flex-shrink-0">
                            <button className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={() => setIsPartModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={handleUpdatePart} disabled={isSubmitting}>
                                {isSubmitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                                {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovementsPage;
