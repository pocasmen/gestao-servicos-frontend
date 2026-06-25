import React from 'react';
import { PartItem } from '../../types';
import logger from '../../utils/logger';
import { StockType } from '../../constants/enums';
import { Trash2, Copy, Clipboard } from 'lucide-react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { usePartSearch } from '../../hooks/usePartSearch';
import { STOCK_TYPE_LABELS } from '../../constants';

interface ReportPartsTableProps {
    parts: PartItem[];
    setParts: React.Dispatch<React.SetStateAction<PartItem[]>>;
    handlePartChange: (index: number, fieldOrUpdates: keyof PartItem | Partial<PartItem>, value?: any) => void;
    handleReferenceBlur: (index: number) => Promise<void>;
}

const ReportPartsTable: React.FC<ReportPartsTableProps> = ({
    parts,
    setParts,
    handlePartChange,
    handleReferenceBlur
}) => {
    const { alert } = useConfirm();
    const { searchResults, searchParts } = usePartSearch();
    const lastSearchResults = React.useRef(searchResults);

    React.useEffect(() => {
        lastSearchResults.current = searchResults;
    }, [searchResults]);

    const handleRemovePart = (index: number) => {
        if (parts.length === 1) {
            setParts([{ quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
        } else {
            setParts(parts.filter((_, i) => i !== index));
        }
    };

    const handleCopyParts = async () => {
        const validParts = parts.filter(p => (p.reference && p.reference.trim() !== '') || (p.designation && p.designation.trim() !== ''));
        if (validParts.length === 0) {
            await alert('Não há peças para copiar.');
            return;
        }
        const partsToCopy = validParts.map(({ quantity, reference, designation, isApplied, stockType }) => ({
            quantity,
            reference,
            designation,
            isApplied,
            stockType
        }));
        const partsString = JSON.stringify(partsToCopy);

        // Guardar no localStorage
        localStorage.setItem('app_parts_clipboard', partsString);

        // Tentar guadar no sistema
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(partsString)
                .then(async () => await alert('Lista de peças copiada!'))
                .catch(async (err) => {
                    logger.warn(err, 'Clipboard API failed:');
                    await alert('Pronto! Lista guardada na memória interna.');
                });
        } else {
            await alert('Pronto! Lista guardada na memória interna.');
        }
    };

    const handlePasteParts = async () => {
        let partsString = localStorage.getItem('app_parts_clipboard');

        if (!partsString && navigator.clipboard && navigator.clipboard.readText) {
            try {
                partsString = await navigator.clipboard.readText();
            } catch (err) {
                logger.warn(err, 'Could not read clipboard API:');
            }
        }

        if (!partsString) {
            await alert('Nenhuma peça encontrada para colar.');
            return;
        }

        try {
            const pastedData = JSON.parse(partsString);
            if (Array.isArray(pastedData)) {
                const newPartsFromPaste = pastedData
                    .filter(p => p.reference || p.designation)
                    .map(p => ({
                        quantity: Number(p.quantity) || 1,
                        reference: p.reference || '',
                        designation: p.designation || '',
                        isDesignationLocked: !!p.reference,
                        isApplied: p.isApplied !== undefined ? p.isApplied : true,
                        stockType: p.stockType || StockType.GENERAL
                    }));

                if (newPartsFromPaste.length === 0) {
                    await alert('Nenhuma peça válida encontrada.');
                    return;
                }

                setParts(prev => {
                    const filteredPrev = prev.filter(p => p.reference.trim() !== '' || p.designation.trim() !== '');
                    return [...filteredPrev, ...newPartsFromPaste, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }];
                });
                await alert(`${newPartsFromPaste.length} peças coladas!`);
            } else {
                await alert('Conteúdo inválido.');
            }
        } catch (err) {
            logger.error(err, 'Erro ao colar:');
            await alert('Erro ao processar as peças.');
        }
    };

    return (
        <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3 text-start">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="text-dark fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-basket-fill me-2 text-primary opacity-50"></i>
                    Peças / Artigos
                </label>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-info rounded-pill px-3 py-1 fw-bold border-2 d-flex align-items-center gap-1"
                        onClick={handleCopyParts}
                        title="Copiar Peças"
                        style={{ fontSize: '0.75rem' }}
                    >
                        <Copy size={12} /> Copiar
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-info rounded-pill px-3 py-1 fw-bold border-2 d-flex align-items-center gap-1"
                        onClick={handlePasteParts}
                        title="Colar Peças"
                        style={{ fontSize: '0.75rem' }}
                    >
                        <Clipboard size={12} /> Colar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded shadow-sm" style={{ overflow: 'visible' }}>
                <table className="table table-bordered table-sm mb-0">
                    <thead className="table-light">
                        <tr className="align-middle">
                            <th style={{ width: '40px' }} className="py-1"></th>
                            <th style={{ width: '75px' }} className="small text-center py-1">Qt</th>
                            <th style={{ width: '160px' }} className="small py-1">Referência</th>
                            <th className="small py-1">Designação</th>
                            <th style={{ width: '80px' }} className="text-center small py-1">Aplicada</th>
                            <th style={{ width: '120px' }} className="small py-1">Origem</th>
                            <th style={{ width: '40px' }} className="py-1"></th>
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
                                        className="form-control form-control-sm text-center border-0"
                                        placeholder="Qtd"
                                        value={part.quantity}
                                        onChange={e => handlePartChange(index, 'quantity', Number(e.target.value))}
                                        min="1"
                                        required
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0"
                                        placeholder="Referência"
                                        list="reportPartRefSuggestions"
                                        value={part.reference}
                                        onChange={e => {
                                            const val = e.target.value;
                                            
                                            // Search for an exact match including our unique zero-width characters
                                            const match = searchResults.find((p, i) => 
                                                (p.reference + '\u200B'.repeat(i)) === val
                                            );

                                            if (match) {
                                                handlePartChange(index, { 
                                                    reference: match.reference, 
                                                    designation: match.designation, 
                                                    image_path: match.image_path,
                                                    track_stock: match.track_stock,
                                                    isDesignationLocked: match.track_stock !== false
                                                });
                                            } else {
                                                handlePartChange(index, 'reference', val);
                                            }
                                            searchParts(val);
                                        }}
                                        onBlur={() => handleReferenceBlur(index)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm border-0"
                                        placeholder="Designação"
                                        list="reportPartDesigSuggestions"
                                        value={part.designation}
                                        onChange={e => {
                                            const val = e.target.value;

                                            // Search for an exact match including our unique zero-width characters
                                            const match = searchResults.find((p, i) => 
                                                (p.designation + '\u200B'.repeat(i)) === val
                                            );

                                            if (match) {
                                                handlePartChange(index, { 
                                                    reference: match.reference, 
                                                    designation: match.designation, 
                                                    image_path: match.image_path,
                                                    track_stock: match.track_stock,
                                                    isDesignationLocked: match.track_stock !== false
                                                });
                                            } else {
                                                handlePartChange(index, 'designation', val);
                                            }
                                            searchParts(val);
                                        }}
                                        disabled={part.isDesignationLocked}
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    {part.track_stock !== false ? (
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={part.isApplied !== false}
                                            onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                        />
                                    ) : (
                                        <span className="text-muted opacity-50 small">—</span>
                                    )}
                                </td>
                                <td>
                                    {part.track_stock !== false ? (
                                        <select
                                            className="form-select form-select-sm border-0"
                                            value={part.stockType || StockType.GENERAL}
                                            onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                        >
                                            <option value={StockType.GENERAL}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</option>
                                            <option value={StockType.FOSS}>{STOCK_TYPE_LABELS[StockType.FOSS]}</option>
                                            <option value={StockType.MSD}>{STOCK_TYPE_LABELS[StockType.MSD]}</option>
                                            <option value={StockType.CONTRACT}>{STOCK_TYPE_LABELS[StockType.CONTRACT]}</option>
                                            <option value={StockType.CLIENT}>{STOCK_TYPE_LABELS[StockType.CLIENT]}</option>
                                            <option value={StockType.WARRANTY}>{STOCK_TYPE_LABELS[StockType.WARRANTY]}</option>
                                        </select>
                                    ) : (
                                        <span className="text-muted opacity-50 small ps-2">—</span>
                                    )}
                                </td>
                                <td className="text-center align-middle">
                                    <button
                                        type="button"
                                        className="btn btn-link text-danger p-0"
                                        onClick={() => handleRemovePart(index)}
                                        title="Remover Peça"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-end">
                <button
                    type="button"
                    className="btn btn-xs btn-outline-primary rounded-pill px-2 py-0"
                    onClick={() => setParts([...parts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }])}
                    style={{ fontSize: '0.7rem' }}
                >
                    <i className="bi bi-plus-circle me-1"></i>
                    Adicionar Peça
                </button>
            </div>

            <datalist id="reportPartRefSuggestions">
                {searchResults.map((p, i) => (
                    <option key={i} value={p.reference + '\u200B'.repeat(i)}>{p.designation}</option>
                ))}
            </datalist>
            <datalist id="reportPartDesigSuggestions">
                {searchResults.map((p, i) => (
                    <option key={i} value={p.designation + '\u200B'.repeat(i)}>{p.reference}</option>
                ))}
            </datalist>
        </div>
    );
};

export default ReportPartsTable;
