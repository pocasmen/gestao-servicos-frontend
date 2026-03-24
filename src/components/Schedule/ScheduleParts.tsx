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
        <div className="form-group mb-2 p-2 border rounded bg-light">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-bold mb-0 d-flex align-items-center small">
                    <i className="bi bi-box-seam-fill me-2 text-primary"></i>
                    Peças a Utilizar
                </label>
                {!isPastOrCompleted && (
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className="btn btn-outline-info d-flex align-items-center gap-1"
                            onClick={handleCopyParts}
                            title="Copiar Peças"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                        >
                            <Copy size={12} /> Copiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-info d-flex align-items-center gap-1"
                            onClick={handlePasteParts}
                            title="Colar Peças"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                        >
                            <Clipboard size={12} /> Colar
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded shadow-sm" style={{ overflow: 'visible' }}>
                <table className="table table-bordered table-sm mb-0">
                    <thead className="table-light">
                        <tr className="align-middle">
                            <th style={{ width: '40px' }} className="py-1"></th>
                            <th style={{ width: '60px' }} className="small text-center py-1">Qt</th>
                            <th style={{ width: '140px' }} className="small py-1">Referência</th>
                            <th className="small py-1">Designação</th>
                            <th style={{ width: '70px' }} className="text-center small py-1">Aplicada</th>
                            <th style={{ width: '100px' }} className="small py-1">Origem</th>
                            <th style={{ width: '35px' }} className="py-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((part, index) => (
                            <tr key={index}>
                                <td className="align-middle text-center p-0">
                                    {part.image_path ? (
                                        <div className="inventory-photo-container d-inline-block">
                                            <img 
                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${part.image_path}`} 
                                                alt={part.reference}
                                                className="inventory-photo-thumbnail rounded shadow-sm border p-1 bg-white"
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
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-light text-muted border p-1 rounded" style={{ width: '30px', height: '30px', margin: 'auto', fontSize: '8px', lineHeight: '20px' }}>?</div>
                                    )}
                                </td>
                                <td className="align-middle">
                                    <input
                                        type="number"
                                        className="form-control form-control-sm text-center border-0 p-0"
                                        placeholder="Qtd"
                                        value={part.quantity}
                                        onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                        disabled={isPastOrCompleted}
                                        min="1"
                                        required
                                        style={{ fontSize: '0.8rem' }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0 p-1"
                                        placeholder="Referência"
                                        list="partRefSuggestions"
                                        value={part.reference}
                                        onChange={e => {
                                            const val = e.target.value;

                                            const match = searchResults.find((p, i) => 
                                                (p.reference + '\u200B'.repeat(i)) === val
                                            );

                                            if (match) {
                                                handlePartChange(index, { reference: match.reference, designation: match.designation, image_path: match.image_path });
                                            } else {
                                                handlePartChange(index, 'reference', val);
                                            }
                                            searchParts(val);
                                        }}
                                        onBlur={() => handleReferenceBlur(index)}
                                        disabled={isPastOrCompleted}
                                        style={{ fontSize: '0.8rem' }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0 p-1"
                                        placeholder="Designação"
                                        list="partDesigSuggestions"
                                        value={part.designation}
                                        onChange={e => {
                                            const val = e.target.value;

                                            const match = searchResults.find((p, i) => 
                                                (p.designation + '\u200B'.repeat(i)) === val
                                            );

                                            if (match) {
                                                handlePartChange(index, { reference: match.reference, designation: match.designation, image_path: match.image_path });
                                            } else {
                                                handlePartChange(index, 'designation', val);
                                            }
                                            searchParts(val);
                                        }}
                                        disabled={part.isDesignationLocked || isPastOrCompleted}
                                        style={{ fontSize: '0.8rem' }}
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={part.isApplied !== false}
                                        onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                        disabled={isPastOrCompleted}
                                    />
                                </td>
                                <td>
                                    <select
                                        className="form-select form-select-sm border-0 p-1"
                                        value={part.stockType || StockType.GENERAL}
                                        onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                        disabled={isPastOrCompleted}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        <option value={StockType.GENERAL}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</option>
                                        <option value={StockType.FOSS}>{STOCK_TYPE_LABELS[StockType.FOSS]}</option>
                                        <option value={StockType.MSD}>{STOCK_TYPE_LABELS[StockType.MSD]}</option>
                                        <option value={StockType.CONTRACT}>{STOCK_TYPE_LABELS[StockType.CONTRACT]}</option>
                                        <option value={StockType.CLIENT}>{STOCK_TYPE_LABELS[StockType.CLIENT]}</option>
                                        <option value={StockType.WARRANTY}>{STOCK_TYPE_LABELS[StockType.WARRANTY]}</option>
                                    </select>
                                </td>
                                <td className="text-center align-middle">
                                    <button
                                        type="button"
                                        className="btn btn-link text-danger p-0"
                                        onClick={() => handleRemovePart(index)}
                                        disabled={isPastOrCompleted}
                                        title="Remover Peça"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!isPastOrCompleted && (
                <div className="mt-1 text-end">
                    <button
                        type="button"
                        className="btn btn-xs btn-outline-primary rounded-pill px-2 py-0"
                        onClick={handleAddPart}
                        style={{ fontSize: '0.7rem' }}
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
