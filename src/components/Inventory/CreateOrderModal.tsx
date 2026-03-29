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
    const [items, setItems] = useState<OrderItem[]>([{ quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { searchResults, searchParts } = usePartSearch();

    const handleAddPart = () => {
        setItems(prev => [...prev, { quantity: 1, reference: '', designation: '', stockType: StockType.GENERAL }]);
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
        const reference = items[index].reference;
        if (reference?.trim()) {
            try {
                const part = await searchPartByReference(reference.trim());
                setItems(prev => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentNumber.trim()) return alert('Número do documento é obrigatório.');

        const validItems = items.filter(i => i.partId && i.quantity > 0);
        if (validItems.length === 0) return alert('É necessário selecionar pelo menos um item válido do inventário.');

        setIsSubmitting(true);
        try {
            await apiClient.post('/api/inventory/orders', {
                document_number: documentNumber.trim(),
                notes: notes.trim(),
                items: validItems
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
            {/* Backdrop */}
            <div
                className="modal-backdrop fade show"
                style={{ zIndex: 1050 }}
                onClick={!isSubmitting ? onClose : undefined}
            />
            {/* Modal */}
            <div
                className="modal show d-block"
                style={{ zIndex: 1055 }}
                tabIndex={-1}
                role="dialog"
            >
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                        <form onSubmit={handleSubmit}>
                            {/* Header */}
                            <div className="modal-header border-0 px-4 pt-4 pb-3">
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'Montserrat, sans-serif', color: '#111827' }}>
                                    <span className="p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}>
                                        <Package size={22} />
                                    </span>
                                    Nova Encomenda
                                </h5>
                                <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} />
                            </div>

                            {/* Body */}
                            <div className="modal-body px-4 py-3 bg-light bg-opacity-50">
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold small text-uppercase text-muted mb-1" style={{ letterSpacing: '0.04em' }}>
                                            Nº Documento <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0 bg-white shadow-sm rounded-3"
                                            placeholder="Ex: PO-2024-001"
                                            value={documentNumber}
                                            onChange={e => setDocumentNumber(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold small text-uppercase text-muted mb-1" style={{ letterSpacing: '0.04em' }}>
                                            Notas
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0 bg-white shadow-sm rounded-3"
                                            placeholder="Observações internas..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Items table */}
                                <div className="rounded-4 overflow-hidden border border-light shadow-sm bg-white" style={{ minHeight: '160px' }}>
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr className="text-uppercase small fw-bold text-muted">
                                                <th className="ps-3" style={{ width: '44px' }}></th>
                                                <th style={{ width: '72px' }}>Qt</th>
                                                <th>Referência</th>
                                                <th>Designação</th>
                                                <th style={{ width: '155px' }}>Stock</th>
                                                <th className="pe-3" style={{ width: '44px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="ps-3 text-center">
                                                        {item.image_path ? (
                                                            <img
                                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`}
                                                                className="rounded border"
                                                                style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <div className="bg-light text-muted d-flex align-items-center justify-content-center rounded border" style={{ width: '30px', height: '30px', fontSize: '9px' }}>?</div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm border-0 bg-transparent fw-bold text-center p-0"
                                                            value={item.quantity}
                                                            onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                            min="1"
                                                            required
                                                            style={{ width: '56px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm border-0 bg-transparent p-0"
                                                            list="orderPartRefSuggestions"
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
                                                            placeholder="Ref. Peça"
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm border-0 bg-transparent p-0"
                                                            list="orderPartDesigSuggestions"
                                                            value={item.designation}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const match = searchResults.find((p, i) => (p.designation + '\u200B'.repeat(i)) === val);
                                                                if (match) {
                                                                    handlePartChange(index, { partId: match.id, reference: match.reference, designation: match.designation, isDesignationLocked: true, image_path: match.image_path });
                                                                } else {
                                                                    handlePartChange(index, 'designation', val);
                                                                }
                                                                searchParts(val);
                                                            }}
                                                            placeholder="Designação"
                                                            disabled={item.isDesignationLocked}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm border-0 bg-transparent p-0"
                                                            value={item.stockType}
                                                            onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                                        >
                                                            <option value={StockType.GENERAL}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</option>
                                                            <option value={StockType.FOSS}>{STOCK_TYPE_LABELS[StockType.FOSS]}</option>
                                                            <option value={StockType.MSD}>{STOCK_TYPE_LABELS[StockType.MSD]}</option>
                                                            <option value={StockType.CONTRACT}>{STOCK_TYPE_LABELS[StockType.CONTRACT]}</option>
                                                        </select>
                                                    </td>
                                                    <td className="pe-3 text-center">
                                                        <button type="button" className="btn btn-link link-danger p-0 shadow-none" onClick={() => handleRemovePart(index)}>
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button type="button" className="btn btn-link btn-sm text-primary fw-semibold p-0 mt-3 d-flex align-items-center gap-1 shadow-none" onClick={handleAddPart}>
                                    <Plus size={15} /> Adicionar Linha
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="modal-footer border-0 px-4 py-3">
                                <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className="btn btn-primary rounded-pill px-5 fw-semibold d-flex align-items-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting ? <span className="spinner-border spinner-border-sm" /> : <Save size={17} />}
                                    Registar Encomenda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Datalists (fora do modal-dialog) */}
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
