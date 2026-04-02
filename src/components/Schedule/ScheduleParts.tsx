import React from 'react';
import { Trash2, Copy, Clipboard } from 'lucide-react';
import { PartItem } from '../../types';
import { StockType } from '../../constants/enums';
import { STOCK_TYPE_LABELS } from '../../constants';
import { usePartSearch } from '../../hooks/usePartSearch';

interface SchedulePartsProps {
    parts: PartItem[];
    handlePartChange: (index: number, fieldOrUpdates: keyof PartItem | Partial<PartItem>, value?: any) => void;
    handleReferenceBlur: (index: number) => void;
    handleRemovePart: (index: number) => void;
    handleAddPart: () => void;
    handleCopyParts: () => void;
    handlePasteParts: () => void;
    isPastOrCompleted: boolean;
    isTicketScheduling: boolean;
}

const ScheduleParts: React.FC<SchedulePartsProps> = ({
    parts,
    handlePartChange,
    handleReferenceBlur,
    handleRemovePart,
    handleAddPart,
    handleCopyParts,
    handlePasteParts,
    isPastOrCompleted,
    isTicketScheduling
}) => {
    const { searchResults, searchParts } = usePartSearch();

    // Removed auto-fill useEffect to avoid ambiguity issues with duplicate designations.
    // Explicit selection via datalist and onChange is now the primary mechanism.

    if (isTicketScheduling) return null;

    return (
        <div className="p-3 bg-white bg-opacity-50 border rounded-4 shadow-sm border-light mb-3 text-start">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="text-muted fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-basket-fill me-2 text-primary opacity-50"></i>
                    Peças / Artigos
                </label>
                {!isPastOrCompleted && (
                    <div className="d-flex gap-2">
                        <div className="btn-group shadow-sm">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-info rounded-start-pill px-3"
                                onClick={handleCopyParts}
                                title="Copiar Peças"
                                style={{ fontSize: '0.75rem' }}
                            >
                                <Copy size={14} className="me-1" /> Copiar
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-info rounded-end-pill px-3"
                                onClick={handlePasteParts}
                                title="Colar Peças"
                                style={{ fontSize: '0.75rem' }}
                            >
                                <Clipboard size={14} className="me-1" /> Colar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="table-responsive rounded-3 overflow-hidden border border-light shadow-sm mb-3">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light">
                        <tr className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.02em' }}>
                            <th style={{ width: '50px' }} className="ps-3 py-2 text-center">Img</th>
                            <th style={{ width: '70px' }} className="text-center py-2">Qt</th>
                            <th style={{ width: '150px' }} className="py-2">Referência</th>
                            <th className="py-2">Designação</th>
                            <th style={{ width: '80px' }} className="text-center py-2">Aplic.</th>
                            <th style={{ width: '120px' }} className="py-2">Origem</th>
                            <th style={{ width: '40px' }} className="pe-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {parts.map((part, index) => (
                            <tr key={index} className="border-bottom border-light">
                                <td className="ps-3 py-2 text-center">
                                    {part.image_path ? (
                                        <div className="inventory-photo-container d-inline-block text-start">
                                            <img 
                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`} 
                                                alt={part.reference}
                                                className="rounded shadow-sm border p-1"
                                                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=?';
                                                }}
                                            />
                                            <div className="inventory-photo-large shadow-lg rounded overflow-hidden">
                                                <img 
                                                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`} 
                                                    alt={`${part.reference} - Grande`}
                                                    className="w-100 h-100"
                                                    style={{ objectFit: 'contain', backgroundColor: '#fff' }}
                                                />
                                            </div>
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
                                        value={part.quantity}
                                        onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                        disabled={isPastOrCompleted}
                                        min="1"
                                        required
                                    />
                                </td>
                                <td className="py-2 text-start">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0 bg-light rounded-pill px-3 shadow-none fw-medium"
                                        placeholder="Ref..."
                                        list="partRefSuggestions"
                                        value={part.reference}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const match = searchResults.find((p, i) => (p.reference + '\u200B'.repeat(i)) === val);
                                            if (match) {
                                                handlePartChange(index, { reference: match.reference, designation: match.designation, image_path: match.image_path });
                                            } else {
                                                handlePartChange(index, 'reference', val);
                                            }
                                            searchParts(val);
                                        }}
                                        onBlur={() => handleReferenceBlur(index)}
                                        disabled={isPastOrCompleted}
                                    />
                                </td>
                                <td className="py-2 text-start">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0 bg-light rounded-pill px-3 shadow-none fw-medium"
                                        placeholder="Designação..."
                                        list="partDesigSuggestions"
                                        value={part.designation}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const match = searchResults.find((p, i) => (p.designation + '\u200B'.repeat(i)) === val);
                                            if (match) {
                                                handlePartChange(index, { reference: match.reference, designation: match.designation, image_path: match.image_path });
                                            } else {
                                                handlePartChange(index, 'designation', val);
                                            }
                                            searchParts(val);
                                        }}
                                        disabled={part.isDesignationLocked || isPastOrCompleted}
                                    />
                                </td>
                                <td className="text-center py-2">
                                    <div className="form-check form-check-inline m-0 custom-checkbox">
                                        <input
                                            type="checkbox"
                                            className="form-check-input shadow-none"
                                            checked={part.isApplied !== false}
                                            onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                            disabled={isPastOrCompleted}
                                            style={{ width: '1.2rem', height: '1.2rem', position: 'relative', top: '1px' }}
                                        />
                                    </div>
                                </td>
                                <td className="py-2">
                                    <select
                                        className="form-select form-select-sm border-0 bg-light rounded-pill px-3 shadow-none fw-semibold"
                                        style={{ fontSize: '0.75rem' }}
                                        value={part.stockType || StockType.GENERAL}
                                        onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                        disabled={isPastOrCompleted}
                                    >
                                        <option value={StockType.GENERAL}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</option>
                                        <option value={StockType.FOSS}>{STOCK_TYPE_LABELS[StockType.FOSS]}</option>
                                        <option value={StockType.MSD}>{STOCK_TYPE_LABELS[StockType.MSD]}</option>
                                        <option value={StockType.CONTRACT}>{STOCK_TYPE_LABELS[StockType.CONTRACT]}</option>
                                        <option value={StockType.CLIENT}>{STOCK_TYPE_LABELS[StockType.CLIENT]}</option>
                                        <option value={StockType.WARRANTY}>{STOCK_TYPE_LABELS[StockType.WARRANTY]}</option>
                                    </select>
                                </td>
                                <td className="pe-3 py-2 text-end">
                                    {!isPastOrCompleted && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger border-0 rounded-circle shadow-none p-1"
                                            onClick={() => handleRemovePart(index)}
                                            title="Remover Peça"
                                            style={{ width: '28px', height: '28px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!isPastOrCompleted && (
                <div className="d-flex justify-content-end">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold shadow-sm"
                        onClick={handleAddPart}
                    >
                        <i className="bi bi-plus-circle me-1"></i>
                        Adicionar Peça
                    </button>
                </div>
            )}

            <datalist id="partRefSuggestions">
                {searchResults.map((p, i) => (
                    <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>
                ))}
            </datalist>
            <datalist id="partDesigSuggestions">
                {searchResults.map((p, i) => (
                    <option key={i} value={p.designation + '\u200B'.repeat(i)}>{p.reference}</option>
                ))}
            </datalist>
        </div>
    );
};

export default ScheduleParts;
