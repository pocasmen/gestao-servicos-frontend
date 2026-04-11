import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Package, ArrowRight, ClipboardCheck, Plus, Save, Trash2, X } from 'lucide-react';
import apiClient, { searchPartByReference } from '../../apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../../contexts/ConfirmContext';
import logger from '../../utils/logger';
import { format } from 'date-fns';
import { usePartSearch } from '../../hooks/usePartSearch';
import { StockType } from '../../constants/enums';
import { STOCK_TYPE_LABELS } from '../../constants';

interface OrderItem {
    partId?: number;
    reference: string;
    designation: string;
    quantity: number;
    stockType: string;
    isDesignationLocked?: boolean;
    image_path?: string;
}

interface OrderDetailsModalProps {
    isOpen: boolean;
    orderId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pendente', cls: 'bg-warning bg-opacity-10 text-warning' },
    PARTIAL: { label: 'Entrega Parcial', cls: 'bg-info bg-opacity-10 text-info' },
    COMPLETED: { label: 'Concluída', cls: 'bg-success bg-opacity-10 text-success' },
    CANCELLED: { label: 'Cancelada', cls: 'bg-danger bg-opacity-10 text-danger' },
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, orderId, onClose, onSuccess }) => {
    const { alert, confirm } = useConfirm();
    const queryClient = useQueryClient();
    const [receivingQtys, setReceivingQtys] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Add items state
    const [isAddingItems, setIsAddingItems] = useState(false);
    const [newItems, setNewItems] = useState<OrderItem[]>([]);
    const { searchResults, searchParts } = usePartSearch();

    const { data: order, isLoading } = useQuery({
        queryKey: ['inventory_order_detail', orderId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/inventory/orders/${orderId}`);
            return res.data;
        },
        enabled: isOpen,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    useEffect(() => {
        if (order?.items) {
            const init: Record<number, number> = {};
            order.items.forEach((item: any) => {
                init[item.id] = Math.max(0, item.quantity_ordered - item.quantity_received);
            });
            setReceivingQtys(init);
        }
    }, [order]);

    const handleReceive = async () => {
        const itemsToReceive = Object.entries(receivingQtys)
            .filter(([, qty]) => qty > 0)
            .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: qty }));

        if (itemsToReceive.length === 0) return alert('Indique a quantidade recebida para pelo menos uma peça.');

        const ok = await confirm({
            title: 'Confirmar Entrada de Stock',
            message: 'Esta operação irá adicionar as quantidades ao stock físico e registar a transação no ledger. Deseja continuar?',
            confirmText: 'Confirmar Receção',
            variant: 'primary',
        });
        if (!ok) return;

        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/inventory/orders/${orderId}/receive`, { items: itemsToReceive });
            onSuccess();
            queryClient.invalidateQueries({ queryKey: ['inventory_order_detail', orderId] });
            setIsAddingItems(false); // Reset add mode if open
            // Do not close so user can see it updated if they want, or we can close it
            onClose(); 
        } catch (err: any) {
            alert(`Erro ao processar receção: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Receive order items error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- ADD ITEMS LOGIC ---
    const handleStartAdding = () => {
        setNewItems([{ quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL }]);
        setIsAddingItems(true);
    };

    const handleAddPart = () => {
        setNewItems(prev => [...prev, { quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL }]);
    };

    const handleRemovePart = (index: number) => {
        setNewItems(prev => prev.filter((_, i) => i !== index));
        if (newItems.length === 1) setIsAddingItems(false);
    };

    const handlePartChange = useCallback((index: number, fieldOrUpdates: keyof OrderItem | Partial<OrderItem>, value?: any) => {
        setNewItems(prev => {
            const next = [...prev];
            if (typeof fieldOrUpdates === 'string') {
                next[index] = { ...next[index], [fieldOrUpdates]: value };
            } else {
                next[index] = { ...next[index], ...fieldOrUpdates };
            }
            return next;
        });
    }, []);

    const handleReferenceBlur = async (index: number) => {
        let reference = newItems[index].reference;
        if (reference) {
            reference = reference.trim().replace(/\s+/g, ' ');
            handlePartChange(index, 'reference', reference);
        }

        if (reference) {
            try {
                const part = await searchPartByReference(reference);
                setNewItems(prev => {
                    const next = [...prev];
                    if (part) {
                        next[index] = { ...next[index], partId: part.id, designation: part.designation, isDesignationLocked: true, image_path: part.image_path };
                    } else {
                        next[index] = { ...next[index], partId: undefined, designation: '', isDesignationLocked: false, image_path: undefined };
                    }
                    return next;
                });
            } catch (err) {
                logger.error(err, 'Error searching part:');
            }
        }
    };

    const handleSaveNewItems = async () => {
        const orderStockType = order?.items?.[0]?.stock_type || StockType.GENERAL;
        const validItems = newItems.filter(i => i.partId && i.quantity > 0).map(i => ({ ...i, stockType: orderStockType }));
        if (validItems.length === 0) return alert('É necessário selecionar pelo menos um item válido do inventário.');

        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/inventory/orders/${orderId}/items`, { items: validItems });
            setIsAddingItems(false);
            setNewItems([]);
            queryClient.invalidateQueries({ queryKey: ['inventory_order_detail', orderId] });
            queryClient.invalidateQueries({ queryKey: ['inventory_orders'] });
            // Show a quick success alert if needed or rely on modal redraw
        } catch (err: any) {
            alert(`Erro ao adicionar itens: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Add order items error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        const ok = await confirm({
            title: 'Remover Peça',
            message: 'Tem a certeza que deseja remover esta peça da encomenda? A peça será removida e as quantidades encomendadas no inventário serão atualizadas.',
            confirmText: 'Remover',
            variant: 'danger',
        });
        if (!ok) return;

        setIsSubmitting(true);
        try {
            await apiClient.delete(`/api/inventory/orders/${orderId}/items/${itemId}`);
            queryClient.invalidateQueries({ queryKey: ['inventory_order_detail', orderId] });
            queryClient.invalidateQueries({ queryKey: ['inventory_orders'] });
        } catch (err: any) {
            alert(`Erro ao remover peça: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Delete order item error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteOrder = async () => {
        const ok = await confirm({
            title: 'Eliminar Encomenda',
            message: 'Tem a certeza que deseja eliminar completamente esta encomenda? Todas as peças serão removidas e as quantidades encomendadas no inventário serão atualizadas. Esta ação é irreversível.',
            confirmText: 'Eliminar Encomenda',
            variant: 'danger',
        });
        if (!ok) return;

        setIsSubmitting(true);
        try {
            await apiClient.delete(`/api/inventory/orders/${orderId}`);
            queryClient.invalidateQueries({ queryKey: ['inventory_orders'] });
            onClose();
        } catch (err: any) {
            alert(`Erro ao eliminar encomenda: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Delete order error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const statusInfo = order ? (STATUS_LABELS[order.status] ?? { label: order.status, cls: 'bg-secondary bg-opacity-10 text-secondary' }) : null;
    const hasReceivable = Object.values(receivingQtys).some(q => q > 0);
    const orderStockType = order?.items?.[0]?.stock_type as StockType || StockType.GENERAL;
    const stockLabel = STOCK_TYPE_LABELS[orderStockType] || orderStockType;

    const modalContent = (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050, opacity: 1, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} onClick={!isSubmitting ? onClose : undefined} />
            <div className="modal show d-block" style={{ zIndex: 1055 }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                        <div className="modal-header bg-dark text-white border-0 px-4 py-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-10 text-white">
                                    <Package size={22} />
                                </span>
                                Encomenda #{orderId}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isSubmitting} />
                        </div>

                        <div className="modal-body px-4 py-4 bg-light bg-opacity-50">
                            {isLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status" />
                                    <p className="mt-3 text-muted">A carregar detalhes...</p>
                                </div>
                            ) : order && (
                                <>
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Nº Documento</div>
                                                <div className="fw-bold text-primary fs-5 m-0" style={{ wordBreak: 'break-word', lineHeight: '1.1' }}>{order.document_number}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Estado</div>
                                                <div>
                                                    {statusInfo && (
                                                        <span className={`badge px-3 py-2 rounded-pill fw-semibold border-0 ${statusInfo.cls} align-self-start d-inline-block`}>{statusInfo.label}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Stock de Destino</div>
                                                <div>
                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-2 fw-bold text-uppercase d-inline-block">{stockLabel}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Registado por</div>
                                                <div className="fw-bold text-truncate" style={{ lineHeight: '1.1', fontSize: '0.95rem' }}>{order.first_name} {order.last_name || ''}</div>
                                                <div className="small text-muted mt-1" style={{ fontSize: '0.75rem', lineHeight: '1' }}>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div className="rounded-4 p-3 bg-white shadow-sm mb-4 small text-secondary border border-light">
                                            <span className="fw-bold text-muted me-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas:</span>
                                            {order.notes}
                                        </div>
                                    )}

                                    <div className="p-3 bg-white border border-light rounded-4 shadow-sm mb-4 text-start">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h6 className="fw-bold text-dark m-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                <i className="bi bi-box-seam me-2 text-primary opacity-50"></i>
                                                Itens da Encomenda
                                            </h6>
                                            {!isAddingItems && order.status !== 'CANCELLED' && (
                                                <button 
                                                    className="btn btn-sm btn-outline-primary rounded-pill fw-bold d-flex align-items-center gap-1 shadow-sm px-3"
                                                    onClick={handleStartAdding}
                                                >
                                                    <Plus size={16} /> Adicionar Peças
                                                </button>
                                            )}
                                        </div>

                                        <div className="rounded-3 overflow-hidden border border-light shadow-sm bg-white mb-2">
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead className="table-light">
                                                    <tr className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.02em' }}>
                                                        <th className="ps-4 py-2">Peça</th>
                                                        <th className="text-center py-2" style={{ width: '80px' }}>Enc.</th>
                                                        <th className="text-center py-2" style={{ width: '80px' }}>Rec.</th>
                                                        <th className="pe-4 text-center py-2" style={{ width: '130px' }}>A Receber</th>
                                                        <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.items?.map((item: any) => {
                                                        const done = item.quantity_received >= item.quantity_ordered;
                                                        return (
                                                            <tr key={item.id} className={`border-bottom border-light ${done ? 'opacity-75' : ''}`}>
                                                                <td className="ps-4 py-2">
                                                                    <div className="fw-semibold">{item.reference}</div>
                                                                    <div className="small text-muted text-truncate" style={{ maxWidth: '260px' }}>
                                                                        {item.designation || item.original_designation}
                                                                    </div>
                                                                </td>
                                                                <td className="text-center fw-medium py-2">{item.quantity_ordered}</td>
                                                                <td className={`text-center fw-bold py-2 ${item.quantity_received > 0 ? 'text-success' : 'text-muted opacity-50'}`}>
                                                                    {item.quantity_received}
                                                                </td>
                                                                <td className="pe-4 text-center py-2">
                                                                    {done ? (
                                                                        <div className="text-success fw-semibold d-flex align-items-center justify-content-center gap-1 small text-uppercase" style={{ letterSpacing: '0.05em' }}>
                                                                            <CheckCircle size={14} /> OK
                                                                        </div>
                                                                    ) : (
                                                                        <input
                                                                            type="number"
                                                                            className="form-control form-control-sm text-center bg-light rounded-pill p-1 shadow-none fw-bold mx-auto border-0"
                                                                            style={{ width: '70px' }}
                                                                            value={receivingQtys[item.id] ?? 0}
                                                                            onChange={e => setReceivingQtys(prev => ({ ...prev, [item.id]: Math.min(parseInt(e.target.value) || 0, item.quantity_ordered - item.quantity_received) }))}
                                                                            max={item.quantity_ordered - item.quantity_received}
                                                                            min={0}
                                                                            disabled={isSubmitting || order.status === 'CANCELLED'}
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="pe-3 py-2 text-end">
                                                                    {item.quantity_received === 0 && order.status !== 'CANCELLED' && (
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-sm btn-outline-danger border-0 rounded-circle shadow-none p-1" 
                                                                            onClick={() => handleDeleteItem(item.id)} 
                                                                            style={{ width: '28px', height: '28px' }}
                                                                            disabled={isSubmitting}
                                                                            title="Remover peça"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {order.items?.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-4 text-muted">Sem itens na encomenda.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ADD ITEMS SECTION */}
                                    {isAddingItems && (
                                        <div className="rounded-4 p-4 border border-primary bg-white shadow-sm mb-4 position-relative">
                                            <button 
                                                className="btn btn-sm btn-link text-secondary position-absolute top-0 end-0 mt-2 me-2 shadow-none"
                                                onClick={() => setIsAddingItems(false)}
                                            >
                                                <X size={20} />
                                            </button>
                                            
                                            <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                Novas Peças a Adicionar
                                            </h6>
                                            
                                            <div className="rounded-3 border border-light shadow-sm mb-3 bg-white" style={{ overflow: 'visible' }}>
                                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                    <thead className="table-light">
                                                        <tr className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.02em' }}>
                                                            <th className="ps-3 py-2 text-center" style={{ width: '50px' }}>Img</th>
                                                            <th className="text-center py-2" style={{ width: '70px' }}>Qt</th>
                                                            <th className="py-2" style={{ width: '150px' }}>Referência</th>
                                                            <th className="py-2">Designação</th>
                                                            <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white">
                                                        {newItems.map((item, index) => (
                                                            <tr key={index} className="border-bottom border-light">
                                                                <td className="ps-3 py-2 text-center">
                                                                    {item.image_path ? (
                                                                        <img
                                                                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`}
                                                                            className="rounded shadow-sm border p-1"
                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                            alt=""
                                                                        />
                                                                    ) : (
                                                                        <div className="bg-light text-muted border rounded d-flex align-items-center justify-content-center m-auto" style={{ width: '32px', height: '32px' }}>
                                                                            <i className="bi bi-image" style={{ fontSize: '12px' }}></i>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2">
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-center border-0 bg-light rounded-pill p-1 shadow-none fw-bold"
                                                                        value={item.quantity}
                                                                        onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                        min="1"
                                                                        required
                                                                    />
                                                                </td>
                                                                <td className="py-2 text-start">
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm border-0 bg-light rounded-pill px-3 shadow-none fw-medium"
                                                                        list="orderPartRefSuggestionsModal"
                                                                        value={item.reference}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            const match = searchResults.find((p, i) => (p.reference + '\u200B'.repeat(i)) === val);
                                                                            if (match) {
                                                                                handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, isDesignationLocked: true, image_path: match.image_path });
                                                                            } else {
                                                                                handlePartChange(index, 'reference', val);
                                                                            }
                                                                            searchParts(val);
                                                                        }}
                                                                        onBlur={() => handleReferenceBlur(index)}
                                                                        placeholder="Ref..."
                                                                        required
                                                                    />
                                                                </td>
                                                                <td className="py-2 text-start">
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm border-0 bg-light rounded-pill px-3 shadow-none fw-medium"
                                                                        value={item.designation}
                                                                        placeholder="Designação..."
                                                                        disabled
                                                                    />
                                                                </td>
                                                                <td className="pe-3 py-2 text-end">
                                                                    <button type="button" className="btn btn-sm btn-outline-danger border-0 rounded-circle shadow-none p-1" onClick={() => handleRemovePart(index)} style={{ width: '28px', height: '28px' }}>
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center mt-3">
                                                <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold shadow-sm" onClick={handleAddPart}>
                                                    <i className="bi bi-plus-circle me-1"></i> Nova Linha
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                                                    onClick={handleSaveNewItems}
                                                    disabled={isSubmitting || newItems.length === 0 || !newItems.some(i => i.reference && i.reference.trim() !== '')}
                                                >
                                                    {isSubmitting ? <span className="spinner-border spinner-border-sm"/> : <Save size={16}/>}
                                                    Confirmar Adição
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="modal-footer px-4 py-3 bg-light bg-opacity-50 border-top mt-auto d-flex justify-content-between">
                            <div>
                                {order?.status === 'PENDING' && !isAddingItems && (
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-danger border rounded-pill px-4 fw-medium shadow-sm d-flex align-items-center gap-2" 
                                        onClick={handleDeleteOrder} 
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 size={16} /> Eliminar Encomenda
                                    </button>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium shadow-sm" onClick={onClose} disabled={isSubmitting}>
                                    Sair
                                </button>
                                {order && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && !isAddingItems && (
                                    <button
                                        type="button"
                                        className="btn btn-primary rounded-pill px-5 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                                        onClick={handleReceive}
                                        disabled={isSubmitting || !hasReceivable}
                                    >
                                        {isSubmitting ? <span className="spinner-border spinner-border-sm" /> : <ClipboardCheck size={17} />}
                                        Registar Receção
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <datalist id="orderPartRefSuggestionsModal">
                    {searchResults.map((p, i) => <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>)}
                </datalist>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default OrderDetailsModal;
