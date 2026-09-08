import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Save, Plus, Trash2, Package } from 'lucide-react';
import apiClient, { searchPartByReference } from '../../apiClient';
import { usePartSearch } from '../../hooks/usePartSearch';
import { StockType } from '../../constants/enums';
import { STOCK_TYPE_LABELS } from '../../constants';
import logger from '../../utils/logger';
import { useConfirm } from '../../contexts/ConfirmContext';

interface OrderItem {
    partId?: number;
    reference: string;
    designation: string;
    quantity: number;
    stockType: string;
    isDesignationLocked?: boolean;
    image_path?: string;
    availableStock?: number;
    note?: string;
}

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { alert } = useConfirm();
    const [documentNumber, setDocumentNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [orderStockType, setOrderStockType] = useState<StockType>(StockType.GENERAL);
    const [items, setItems] = useState<OrderItem[]>([{ quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL, note: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { searchResults, searchParts } = usePartSearch();

    const handleAddPart = () => {
        setItems(prev => [...prev, { quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL, note: '' }]);
    };

    const handleRemovePart = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handlePartChange = useCallback((index: number, fieldOrUpdates: keyof OrderItem | Partial<OrderItem>, value?: any) => {
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
                setItems(prev => {
                    const next = [...prev];
                    if (part) {
                        const available = (orderStockType === StockType.FOSS) 
                            ? ((part.stock_quantity_foss || 0) - (part.reserved_quantity_foss || 0))
                            : ((part.stock_quantity || 0) - (part.reserved_quantity || 0));
                        next[index] = { ...next[index], partId: part.id, designation: part.designation, isDesignationLocked: true, image_path: part.image_path, availableStock: available };
                    } else {
                        next[index] = { ...next[index], partId: undefined, designation: '', isDesignationLocked: false, image_path: undefined, availableStock: undefined };
                    }
                    return next;
                });
            } catch (err) {
                logger.error(err, 'Error searching part:');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentNumber.trim()) return alert('Número do documento é obrigatório.');

        const validItems = items.filter(i => i.reference && i.reference.trim() !== '' && i.quantity > 0);
        if (validItems.length === 0) return alert('É necessário incluir pelo menos um artigo válido (com referência) na encomenda.');

        setIsSubmitting(true);
        try {
            await apiClient.post('/api/inventory/orders', {
                document_number: documentNumber.trim(),
                notes: notes.trim(),
                items: validItems.map(i => ({ 
                    partId: i.partId,
                    reference: i.reference,
                    designation: i.designation,
                    quantity: i.quantity,
                    stockType: orderStockType,
                    note: i.note 
                }))
            });
            onSuccess();
        } catch (err: any) {
            alert(`Erro ao criar encomenda: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Create Order error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <>
            <div
                className="modal-backdrop fade show"
                style={{ zIndex: 1050, opacity: 1, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
                onClick={!isSubmitting ? onClose : undefined}
            />
            <div
                className="modal show d-block"
                style={{ zIndex: 1055 }}
                tabIndex={-1}
                role="dialog"
            >
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', maxHeight: '90vh' }}>
                        <div className="modal-header border-0 px-4 pt-4 pb-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'var(--font-family-title)', color: '#111827' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary">
                                    <Package size={22} />
                                </span>
                                Nova Encomenda
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} />
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div className="modal-body px-4 py-3 bg-light bg-opacity-50" style={{ overflowY: 'auto' }}>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            Nº Documento <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0 bg-white shadow-sm rounded-3 py-2 px-3 fw-medium"
                                            placeholder="Ex: PO-2024-001"
                                            value={documentNumber}
                                            onChange={e => setDocumentNumber(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            Stock de Destino
                                        </label>
                                        <select
                                            className="form-select border-0 bg-white shadow-sm rounded-3 py-2 px-3 fw-medium"
                                            value={orderStockType}
                                            onChange={e => setOrderStockType(e.target.value as StockType)}
                                        >
                                            <option value={StockType.GENERAL}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</option>
                                            <option value={StockType.FOSS}>{STOCK_TYPE_LABELS[StockType.FOSS]}</option>
                                            <option value={StockType.MSD}>{STOCK_TYPE_LABELS[StockType.MSD]}</option>
                                            <option value={StockType.CONTRACT}>{STOCK_TYPE_LABELS[StockType.CONTRACT]}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-12">
                                        <label className="form-label fw-bold text-dark text-uppercase mb-1" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            Notas
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0 bg-white shadow-sm rounded-3 py-2 px-3 fw-medium"
                                            placeholder="Observações internas..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <h6 className="fw-bold text-dark mb-2 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                    <i className="bi bi-basket-fill me-2 text-primary opacity-50"></i>
                                    Artigos a Encomendar
                                </h6>

                                <div className="rounded-3 border border-light shadow-sm mb-3 bg-white">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.02em' }}>
                                                <th className="ps-3 py-2 text-center" style={{ width: '50px' }}>Img</th>
                                                <th className="text-center py-2" style={{ width: '70px' }}>Qt</th>
                                                <th className="py-2" style={{ width: '165px' }}>Referência</th>
                                                <th className="py-2" style={{ minWidth: '200px' }}>Designação</th>
                                                <th className="py-2 text-center" style={{ width: '70px' }}>Stock</th>
                                                <th className="py-2" style={{ minWidth: '150px' }}>Nota / Destino</th>
                                                <th className="pe-3 py-2" style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
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
                                                            </div>
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
                                                            list="orderPartRefSuggestions"
                                                            value={item.reference}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const match = searchResults.find((p, i) => (p.reference + '\u200B'.repeat(i)) === val);
                                                                if (match) {
                                                                    const available = (orderStockType === StockType.FOSS) 
                                                                        ? ((match.stock_quantity_foss || 0) - (match.reserved_quantity_foss || 0))
                                                                        : ((match.stock_quantity || 0) - (match.reserved_quantity || 0));
                                                                    handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, isDesignationLocked: true, image_path: match.image_path, availableStock: available });
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
                                                            list="orderPartDesigSuggestions"
                                                            value={item.designation}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const match = searchResults.find((p, i) => (p.designation + '\u200B'.repeat(i)) === val);
                                                                if (match) {
                                                                    const available = (orderStockType === StockType.FOSS) 
                                                                        ? ((match.stock_quantity_foss || 0) - (match.reserved_quantity_foss || 0))
                                                                        : ((match.stock_quantity || 0) - (match.reserved_quantity || 0));
                                                                    handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, isDesignationLocked: true, image_path: match.image_path, availableStock: available });
                                                                } else {
                                                                    handlePartChange(index, 'designation', val);
                                                                }
                                                                searchParts(val);
                                                            }}
                                                            onBlur={() => {
                                                                if (item.designation) {
                                                                    handlePartChange(index, 'designation', item.designation.trim().replace(/\s+/g, ' '));
                                                                }
                                                            }}
                                                            placeholder="Designação..."
                                                            disabled={item.isDesignationLocked}
                                                        />
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <span className={`badge rounded-pill ${item.availableStock && item.availableStock > 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${item.availableStock && item.availableStock > 0 ? 'text-success' : 'text-danger'} fw-bold border-0`} style={{ fontSize: '0.8rem' }}>
                                                            {item.availableStock ?? '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2">
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm border-0 bg-light rounded-pill px-3 shadow-none fw-medium py-2"
                                                            value={item.note || ''}
                                                            onChange={e => handlePartChange(index, 'note', e.target.value)}
                                                            placeholder="Destino..."
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

                                <div className="d-flex justify-content-end">
                                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold shadow-sm mt-1" onClick={handleAddPart}>
                                        <i className="bi bi-plus-circle me-1"></i> Adicionar Peça
                                    </button>
                                </div>
                            </div>

                            <div className="modal-footer px-4 py-3 bg-light bg-opacity-50 border-top mt-auto">
                                <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium shadow-sm" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" disabled={isSubmitting}>
                                    {isSubmitting ? <span className="spinner-border spinner-border-sm" /> : <Save size={16} />}
                                    Registar Encomenda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <datalist id="orderPartRefSuggestions">
                    {searchResults.map((p, i) => <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>)}
                </datalist>
                <datalist id="orderPartDesigSuggestions">
                    {searchResults.map((p, i) => <option key={i} value={p.designation + '\u200B'.repeat(i)}>{p.reference}</option>)}
                </datalist>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default CreateOrderModal;
