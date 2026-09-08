import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Save, Plus, Trash2, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import apiClient, { searchPartByReference } from '../../apiClient';
import { usePartSearch } from '../../hooks/usePartSearch';
import { StockType } from '../../constants/enums';
import { STOCK_TYPE_LABELS } from '../../constants';
import logger from '../../utils/logger';
import { useConfirm } from '../../contexts/ConfirmContext';

interface SaleItem {
    partId: number;
    reference: string;
    designation: string;
    quantity: number;
    image_path?: string;
    availableStock?: number;
}

interface CreateSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateSaleModal: React.FC<CreateSaleModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { alert } = useConfirm();
    const [documentNumber, setDocumentNumber] = useState('');
    const [saleType, setSaleType] = useState('SALE');
    const [notes, setNotes] = useState('');
    const [saleStockType, setSaleStockType] = useState<StockType>(StockType.GENERAL);
    const [items, setItems] = useState<Partial<SaleItem>[]>([{ quantity: 1, reference: '', designation: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { searchResults, searchParts } = usePartSearch();

    const handleAddPart = () => {
        setItems(prev => [...prev, { quantity: 1, reference: '', designation: '' }]);
    };

    const handleRemovePart = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handlePartChange = useCallback((index: number, fieldOrUpdates: keyof SaleItem | Partial<SaleItem>, value?: any) => {
        setItems(prev => {
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
        let reference = items[index].reference;
        if (reference) {
            reference = reference.trim().replace(/\s+/g, ' ');
            handlePartChange(index, 'reference', reference);
        }

        if (reference) {
            try {
                const part = await searchPartByReference(reference);
                if (part) {
                    const available = (saleStockType === StockType.FOSS) 
                        ? ((part.stock_quantity_foss || 0) - (part.reserved_quantity_foss || 0))
                        : ((part.stock_quantity || 0) - (part.reserved_quantity || 0));

                    handlePartChange(index, { 
                        partId: part.id, 
                        designation: part.designation, 
                        image_path: part.image_path,
                        availableStock: available
                    });
                } else {
                    handlePartChange(index, { partId: undefined, designation: '', image_path: undefined, availableStock: undefined });
                }
            } catch (err) {
                logger.error(err, 'Error searching part:');
            }
        }
    };

    const handleStockTypeChange = (newType: StockType) => {
        setSaleStockType(newType);
        // Update available stock for all items based on new global stock type
        setItems(prev => prev.map(item => {
            if (!item.partId) return item;
            // Since searchResults might not have all parts, we might need a better way, 
            // but for simple cases we look in searchResults or just reset availableStock to trigger re-fetch if needed.
            // For now, let's try to find it in searchResults.
            const part = searchResults.find(p => p.id === item.partId);
            if (part) {
                const available = (newType === StockType.FOSS) 
                    ? ((part.stock_quantity_foss || 0) - (part.reserved_quantity_foss || 0))
                    : ((part.stock_quantity || 0) - (part.reserved_quantity || 0));
                return { ...item, availableStock: available };
            }
            return item;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentNumber.trim()) return alert('Número do documento é obrigatório.');

        const validItems = items.filter(i => i.partId && i.quantity && i.quantity > 0);
        if (validItems.length === 0) return alert('É necessário incluir pelo menos um artigo válido (com referência) na lista.');

        // Check stock
        for (const item of validItems) {
            if (item.quantity! > (item.availableStock || 0)) {
                return alert(`Stock insuficiente para o artigo ${item.reference}. Disponível: ${item.availableStock}`);
            }
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/api/inventory/sales', {
                document_number: documentNumber.trim(),
                sale_type: saleType,
                stockType: saleStockType,
                notes: notes.trim(),
                items: validItems
            });
            onSuccess();
        } catch (err: any) {
            alert(`Erro ao registar saída: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Create Sale error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050, opacity: 1, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} onClick={!isSubmitting ? onClose : undefined} />
            <div className="modal show d-block" style={{ zIndex: 1055 }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', maxHeight: '90vh' }}>
                        <div className="modal-header border-0 px-4 pt-4 pb-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'var(--font-family-title)', color: '#111827' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary">
                                    <ShoppingCart size={22} />
                                </span>
                                Nova Venda / Saída
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} />
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div className="modal-body px-4 py-3 bg-light bg-opacity-50" style={{ overflowY: 'auto' }}>


                                <div className="row g-3 mb-3">
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem' }}>Tipo de Saída</label>
                                        <select className="form-select border-0 bg-white shadow-sm rounded-3 py-2 fw-medium px-3" value={saleType} onChange={e => setSaleType(e.target.value)}>
                                            <option value="SALE">Venda</option>
                                            <option value="CONSIGNMENT">Consignação</option>
                                            <option value="GIVEAWAY">Oferta</option>
                                            <option value="DISCARD">Descarte / Abate</option>
                                            <option value="RETURN">Devolução</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem' }}>Inventário de Saída</label>
                                        <select className="form-select border-0 bg-white shadow-sm rounded-3 py-2 fw-medium px-3" value={saleStockType} onChange={e => handleStockTypeChange(e.target.value as StockType)}>
                                            <option value={StockType.GENERAL}>Geral</option>
                                            <option value={StockType.FOSS}>Foss</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem' }}>Nº Documento <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control border-0 bg-white shadow-sm rounded-3 py-2 fw-medium px-3" placeholder="Ex: FT-2024/001" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} required />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem' }}>Notas</label>
                                        <input type="text" className="form-control border-0 bg-white shadow-sm rounded-3 py-2 fw-medium px-3" placeholder="Obs..." value={notes} onChange={e => setNotes(e.target.value)} />
                                    </div>
                                </div>

                                <h6 className="fw-bold text-dark mb-3 text-uppercase" style={{ fontSize: '0.85rem' }}>Artigos a Sair</h6>
                                <div className="rounded-3 border border-light shadow-sm mb-3 bg-white" style={{ minHeight: '160px', overflow: 'visible' }}>
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="table-light">
                                            <tr className="text-uppercase small fw-bold text-muted">
                                                <th className="ps-3 py-2 text-center" style={{ width: '60px' }}>Img</th>
                                                <th className="py-2 text-center" style={{ width: '80px' }}>Qt</th>
                                                <th className="py-2" style={{ width: '150px' }}>Referência</th>
                                                <th className="py-2">Designação</th>
                                                <th className="py-2 text-center" style={{ width: '80px' }}>Stock</th>
                                                <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-bottom border-light">
                                                    <td className="ps-3 py-2 text-center">
                                                        {item.image_path ? (
                                                            <div className="inventory-photo-container d-inline-block text-start">
                                                                <img
                                                                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`}
                                                                    className="rounded shadow-sm border p-1"
                                                                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                    alt={item.reference}
                                                                />
                                                                <div className="inventory-photo-large shadow-lg rounded overflow-hidden">
                                                                    <img 
                                                                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`} 
                                                                        alt={`${item.reference} - Grande`}
                                                                        className="w-100 h-100"
                                                                        style={{ objectFit: 'contain', backgroundColor: '#fff' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-light text-muted border rounded d-flex align-items-center justify-content-center m-auto" style={{ width: '32px', height: '32px' }}>
                                                                <ImageIcon size={14} />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2">
                                                        <input type="number" className="form-control form-control-sm text-center border-0 bg-light rounded-pill fw-bold py-2 px-1" value={item.quantity} onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)} min="1" required />
                                                    </td>
                                                    <td className="py-2">
                                                        <input type="text" className="form-control form-control-sm border-0 bg-light rounded-pill px-3 fw-medium py-2" list="salePartRefSuggestions" value={item.reference} onChange={e => {
                                                            const val = e.target.value;
                                                            const match = searchResults.find((p, i) => (p.reference + '\u200B'.repeat(i)) === val);
                                                            if (match) {
                                                                const available = (saleStockType === StockType.FOSS) 
                                                                    ? ((match.stock_quantity_foss || 0) - (match.reserved_quantity_foss || 0))
                                                                    : ((match.stock_quantity || 0) - (match.reserved_quantity || 0));
                                                                handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, image_path: match.image_path, availableStock: available });
                                                            } else {
                                                                handlePartChange(index, 'reference', val);
                                                            }
                                                            searchParts(val);
                                                        }} onBlur={() => handleReferenceBlur(index)} placeholder="Ref..." required />
                                                    </td>
                                                    <td className="py-2">
                                                        <input type="text" className="form-control form-control-sm border-0 bg-light rounded-pill px-3 fw-medium py-2" list="salePartDesigSuggestions" value={item.designation} onChange={e => {
                                                            const val = e.target.value;
                                                            const match = searchResults.find((p, i) => (p.designation + '\u200B'.repeat(i)) === val);
                                                            if (match) {
                                                                const available = (saleStockType === StockType.FOSS) 
                                                                    ? ((match.stock_quantity_foss || 0) - (match.reserved_quantity_foss || 0))
                                                                    : ((match.stock_quantity || 0) - (match.reserved_quantity || 0));
                                                                handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, image_path: match.image_path, availableStock: available });
                                                            } else {
                                                                handlePartChange(index, 'designation', val);
                                                            }
                                                            searchParts(val);
                                                        }} onBlur={() => {
                                                            if (item.designation) {
                                                                handlePartChange(index, 'designation', item.designation.trim().replace(/\s+/g, ' '));
                                                            }
                                                        }} placeholder="Designação..." required />
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <span className={`badge rounded-pill ${item.availableStock && item.availableStock > 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${item.availableStock && item.availableStock > 0 ? 'text-success' : 'text-danger'} fw-bold border-0`} style={{ fontSize: '0.85rem' }}>
                                                            {item.availableStock ?? '-'}
                                                        </span>
                                                    </td>
                                                    <td className="pe-3 py-2 text-end">
                                                        <button type="button" className="btn btn-sm btn-outline-danger border-0 rounded-circle p-1" onClick={() => handleRemovePart(index)} style={{ width: '28px', height: '28px' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-end">
                                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold mt-1 shadow-sm" onClick={handleAddPart}><Plus size={16} className="me-1" /> Adicionar Artigo</button>
                                </div>
                            </div>

                            <div className="modal-footer px-4 py-3 bg-light bg-opacity-50 border-top mt-auto">
                                <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium shadow-sm" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" disabled={isSubmitting}>
                                    {isSubmitting ? <span className="spinner-border spinner-border-sm" /> : <Save size={16} />}
                                    Confirmar Saída
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <datalist id="salePartRefSuggestions">
                    {searchResults.map((p, i) => <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>)}
                </datalist>
                <datalist id="salePartDesigSuggestions">
                    {searchResults.map((p, i) => <option key={i} value={p.designation + '\u200B'.repeat(i)}>{p.reference}</option>)}
                </datalist>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default CreateSaleModal;
