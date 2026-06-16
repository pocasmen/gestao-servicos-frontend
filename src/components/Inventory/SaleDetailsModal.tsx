import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Calendar, User, CreditCard, Gift, Trash2, Image as ImageIcon, Trash, ShoppingCart, Plus, Save, X } from 'lucide-react';
import apiClient from '../../apiClient';
import { format } from 'date-fns';
import { useConfirm } from '../../contexts/ConfirmContext';
import logger from '../../utils/logger';
import { usePartSearch } from '../../hooks/usePartSearch';
import { StockType } from '../../constants/enums';

interface SaleDetailsModalProps {
    isOpen: boolean;
    saleId: number;
    onClose: () => void;
    onSuccess?: () => void;
}

const SALE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
    SALE: { label: 'Venda', cls: 'bg-success bg-opacity-10 text-success' },
    GIVEAWAY: { label: 'Oferta', cls: 'bg-info bg-opacity-10 text-info' },
    DISCARD: { label: 'Descarte', cls: 'bg-danger bg-opacity-10 text-danger' },
};

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ isOpen, saleId, onClose, onSuccess }) => {
    const { confirm, alert } = useConfirm();
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Add items state
    const [isAddingItems, setIsAddingItems] = useState(false);
    const [newItems, setNewItems] = useState<any[]>([]);
    const { searchResults, searchParts } = usePartSearch();

    const { data: sale, isLoading } = useQuery({
        queryKey: ['inventory_sale_detail', saleId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/inventory/sales/${saleId}`);
            return response.data;
        },
        enabled: !!saleId
    });

    if (!isOpen) return null;

    const handleDeleteSale = async () => {
        const confirmed = await confirm({
            title: 'Eliminar Saída',
            message: `Tem a certeza que deseja eliminar a saída #${sale.id} (${sale.document_number})? Os itens serão repostos no inventário ${sale.stock_type === 'contract' ? 'Foss' : 'Geral'}.`,
            confirmText: 'Sim, Eliminar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (confirmed) {
            setIsDeleting(true);
            try {
                await apiClient.delete(`/api/inventory/sales/${saleId}`);
                onSuccess?.();
                onClose();
            } catch (err: any) {
                alert(`Erro ao eliminar saída: ${err.response?.data?.details || err.message}`);
                logger.error(err, 'Delete Sale error:');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // --- ADD ITEMS LOGIC ---
    const handleStartAdding = () => {
        setNewItems([{ quantity: 1, reference: '', designation: '' }]);
        setIsAddingItems(true);
    };

    const handleAddPart = () => {
        setNewItems(prev => [...prev, { quantity: 1, reference: '', designation: '' }]);
    };

    const handleRemovePart = (index: number) => {
        setNewItems(prev => prev.filter((_, i) => i !== index));
        if (newItems.length === 1) setIsAddingItems(false);
    };

    const handlePartChange = useCallback((index: number, fieldOrUpdates: any, value?: any) => {
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

    const handleSaveNewItems = async () => {
        const validItems = newItems.filter(i => i.partId && i.quantity && i.quantity > 0);
        if (validItems.length === 0) return alert('É necessário incluir pelo menos um artigo válido (com referência) na lista.');

        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/inventory/sales/${saleId}/items`, { items: validItems });
            setIsAddingItems(false);
            setNewItems([]);
            queryClient.invalidateQueries({ queryKey: ['inventory_sale_detail', saleId] });
            queryClient.invalidateQueries({ queryKey: ['inventory_sales'] });
        } catch (err: any) {
            alert(`Erro ao adicionar itens: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Add sale items error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        const ok = await confirm({
            title: 'Remover Peça',
            message: 'Tem a certeza que deseja remover esta peça da venda? A peça será reposta no inventário.',
            confirmText: 'Remover',
            variant: 'danger',
        });
        if (!ok) return;

        setIsSubmitting(true);
        try {
            await apiClient.delete(`/api/inventory/sales/${saleId}/items/${itemId}`);
            queryClient.invalidateQueries({ queryKey: ['inventory_sale_detail', saleId] });
            queryClient.invalidateQueries({ queryKey: ['inventory_sales'] });
        } catch (err: any) {
            alert(`Erro ao remover peça: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Delete sale item error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    const saleTypeInfo = sale ? (SALE_TYPE_LABELS[sale.sale_type] ?? { label: sale.sale_type, cls: 'bg-secondary bg-opacity-10 text-secondary' }) : null;

    const modalContent = (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050, opacity: 1, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} onClick={!isDeleting && !isSubmitting ? onClose : undefined} />
            <div className="modal show d-block" style={{ zIndex: 1055 }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }}>
                        <div className="modal-header bg-dark text-white border-0 px-4 py-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-10 text-white">
                                    <ShoppingCart size={22} />
                                </span>
                                Detalhes da Saída #{saleId}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isDeleting || isSubmitting} />
                        </div>

                        <div className="modal-body px-4 py-4 bg-light bg-opacity-50">
                            {isLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status" />
                                    <p className="mt-3 text-muted">A carregar detalhes...</p>
                                </div>
                            ) : sale && (
                                <>
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Nº Documento</div>
                                                <div className="fw-bold text-primary fs-5 m-0" style={{ wordBreak: 'break-word', lineHeight: '1.1' }}>{sale.document_number}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Tipo de Saída</div>
                                                <div>
                                                    {saleTypeInfo && (
                                                        <span className={`badge px-3 py-2 rounded-pill fw-semibold border-0 ${saleTypeInfo.cls} align-self-start d-inline-block`}>{saleTypeInfo.label}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Inventário</div>
                                                <div>
                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-2 fw-bold text-uppercase d-inline-block">
                                                        {sale.stock_type === 'contract' ? 'Foss' : 'Geral'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Registado por</div>
                                                <div className="fw-bold text-truncate" style={{ lineHeight: '1.1', fontSize: '0.95rem' }}>{sale.first_name} {sale.last_name || ''}</div>
                                                <div className="small text-muted mt-1" style={{ fontSize: '0.75rem', lineHeight: '1' }}>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {sale.notes && (
                                        <div className="rounded-4 p-3 bg-white shadow-sm mb-4 small text-secondary border border-light">
                                            <span className="fw-bold text-muted me-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas:</span>
                                            {sale.notes}
                                        </div>
                                    )}

                                    <div className="p-3 bg-white border border-light rounded-4 shadow-sm mb-4 text-start">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h6 className="fw-bold text-dark m-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                <i className="bi bi-box-seam me-2 text-primary opacity-50"></i>
                                                Artigos da Saída
                                            </h6>
                                            {!isAddingItems && (
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
                                                    <tr className="small text-uppercase fw-bold text-muted">
                                                        <th className="ps-3 py-2 text-center" style={{ width: '60px' }}>Img</th>
                                                        <th className="py-2 text-center" style={{ width: '80px' }}>Qt</th>
                                                        <th className="py-2" style={{ width: '150px' }}>Referência</th>
                                                        <th className="py-2">Designação</th>
                                                        <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sale.items?.map((item: any) => (
                                                        <tr key={item.id} className="border-bottom border-light">
                                                            <td className="ps-3 py-2 text-center">
                                                                {item.image_path ? (
                                                                    <div className="inventory-photo-container d-inline-block text-start">
                                                                        <img
                                                                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`}
                                                                            className="rounded shadow-sm border p-1"
                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                            alt={item.reference}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-light text-muted border rounded d-flex align-items-center justify-content-center m-auto" style={{ width: '32px', height: '32px' }}>
                                                                        <ImageIcon size={14} />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <span className="badge bg-dark rounded-pill px-3 py-2">{item.quantity}</span>
                                                            </td>
                                                            <td className="py-3 fw-bold text-primary">{item.reference}</td>
                                                            <td className="py-3">
                                                                <div className="fw-medium">{item.designation}</div>
                                                            </td>
                                                            <td className="pe-3 py-3 text-end">
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-sm btn-outline-danger border-0 rounded-circle shadow-none p-1" 
                                                                    onClick={() => handleDeleteItem(item.id)} 
                                                                    style={{ width: '28px', height: '28px' }}
                                                                    disabled={isDeleting || isSubmitting}
                                                                    title="Remover peça"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {isAddingItems && (
                                        <div className="rounded-4 p-4 border border-primary bg-white shadow-sm mb-4 position-relative">
                                            <button 
                                                className="btn btn-sm btn-link text-secondary position-absolute top-0 end-0 mt-2 me-2 shadow-none"
                                                onClick={() => setIsAddingItems(false)}
                                            >
                                                <X size={20} />
                                            </button>
                                            <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>Novas Peças a Adicionar</h6>
                                            
                                            {/* Table for adding items */}
                                            <div className="rounded-3 border border-light shadow-sm mb-3 bg-white">
                                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr className="text-uppercase small fw-bold text-muted">
                                                            <th className="ps-3 py-2 text-center" style={{ width: '60px' }}>Qt</th>
                                                            <th className="py-2" style={{ width: '150px' }}>Referência</th>
                                                            <th className="py-2">Designação</th>
                                                            <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white">
                                                        {newItems.map((item, index) => (
                                                            <tr key={index} className="border-bottom border-light">
                                                                <td className="py-2">
                                                                    <input type="number" className="form-control form-control-sm text-center border-0 bg-light rounded-pill fw-bold py-2 px-1" value={item.quantity} onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)} min="1" required />
                                                                </td>
                                                                <td className="py-2">
                                                                    <input type="text" className="form-control form-control-sm border-0 bg-light rounded-pill px-3 fw-medium py-2" list="salePartRefSuggestionsModal" value={item.reference} onChange={e => {
                                                                        const val = e.target.value;
                                                                        const match = searchResults.find((p, i) => (p.reference + '\u200B'.repeat(i)) === val);
                                                                        if (match) {
                                                                            handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, image_path: match.image_path });
                                                                        } else {
                                                                            handlePartChange(index, 'reference', val);
                                                                        }
                                                                        searchParts(val);
                                                                    }} placeholder="Ref..." required />
                                                                </td>
                                                                <td className="py-2">
                                                                    <input type="text" className="form-control form-control-sm border-0 bg-light rounded-pill px-3 fw-medium py-2" list="salePartDesigSuggestionsModal" value={item.designation} onChange={e => {
                                                                        const val = e.target.value;
                                                                        const match = searchResults.find((p, i) => (p.designation + '\u200B'.repeat(i)) === val);
                                                                        if (match) {
                                                                            handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, image_path: match.image_path });
                                                                        } else {
                                                                            handlePartChange(index, 'designation', val);
                                                                        }
                                                                        searchParts(val);
                                                                    }} placeholder="Designação..." required />
                                                                </td>

                                                                <td className="pe-3 py-2 text-end">
                                                                    <button type="button" className="btn btn-sm btn-outline-danger border-0 rounded-circle p-1" onClick={() => handleRemovePart(index)} style={{ width: '28px', height: '28px' }}><Trash2 size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="d-flex justify-content-end mt-3 gap-2">
                                                <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold" onClick={handleAddPart}><Plus size={16} className="me-1" /> Nova Linha</button>
                                                <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={handleSaveNewItems} disabled={isSubmitting}>Confirmar Adição</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="modal-footer px-4 py-3 bg-light bg-opacity-50 border-top mt-auto d-flex justify-content-between">
                                <button 
                                    type="button" 
                                    className="btn btn-outline-danger border rounded-pill px-4 fw-medium shadow-sm d-flex align-items-center gap-2" 
                                    onClick={handleDeleteSale} 
                                    disabled={isDeleting || isSubmitting || isLoading}
                                >
                                    {isDeleting ? <span className="spinner-border spinner-border-sm" /> : <Trash2 size={16} />} 
                                    Eliminar Venda
                                </button>
                                <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium shadow-sm" onClick={onClose} disabled={isDeleting || isSubmitting}>
                                    Sair
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <datalist id="salePartRefSuggestionsModal">
                    {searchResults.map((p, i) => <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>)}
                </datalist>
                <datalist id="salePartDesigSuggestionsModal">
                    {searchResults.map((p, i) => <option key={i} value={p.designation + '\u200B'.repeat(i)}>{p.reference}</option>)}
                </datalist>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default SaleDetailsModal;
