import React from 'react';
import { PartItem } from '../../types';
import logger from '../../utils/logger';
import { StockType } from '../../constants/enums';
import { Trash2, Copy, Clipboard } from 'lucide-react';
import { useConfirm } from '../../contexts/ConfirmContext';

interface ReportPartsTableProps {
    parts: PartItem[];
    setParts: React.Dispatch<React.SetStateAction<PartItem[]>>;
    handlePartChange: (index: number, field: keyof PartItem, value: any) => void;
    handleReferenceBlur: (index: number) => Promise<void>;
}

const ReportPartsTable: React.FC<ReportPartsTableProps> = ({
    parts,
    setParts,
    handlePartChange,
    handleReferenceBlur
}) => {
    const { alert } = useConfirm();

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
        const partsToCopy = validParts.map(({ quantity, reference, designation }) => ({
            quantity,
            reference,
            designation
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
                        isDesignationLocked: !!p.reference
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
        <div className="form-group mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="mb-0 text-secondary fw-bold">Peças Utilizadas</label>
            </div>
            <div className="table-responsive">
                <table className="table table-bordered">
                    <thead className="table-light">
                        <tr className="align-middle">
                            <th style={{ width: '75px' }} className="small">Qt</th>
                            <th style={{ width: '160px' }} className="small">Referência</th>
                            <th className="small">Designação</th>
                            <th style={{ width: '80px' }} className="text-center small">Aplicada</th>
                            <th style={{ width: '120px' }} className="small">Origem</th>
                            <th style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((part, index) => (
                            <tr key={index}>
                                <td className="align-middle">
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
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
                                        className="form-control form-control-sm"
                                        placeholder="Referência"
                                        value={part.reference}
                                        onChange={e => handlePartChange(index, 'reference', e.target.value)}
                                        onBlur={() => handleReferenceBlur(index)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Designação"
                                        value={part.designation}
                                        onChange={e => handlePartChange(index, 'designation', e.target.value)}
                                        disabled={part.isDesignationLocked}
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    <div className="d-flex justify-content-center">
                                        <input
                                            type="checkbox"
                                            className="form-check-input mt-0"
                                            checked={part.isApplied !== false}
                                            onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        value={part.stockType || StockType.GENERAL}
                                        onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                    >
                                        <option value={StockType.GENERAL}>Geral</option>
                                        <option value={StockType.CONTRACT}>Contrato</option>
                                        <option value={StockType.CLIENT}>Cliente</option>
                                        <option value={StockType.WARRANTY}>Garantia</option>
                                    </select>
                                </td>
                                <td className="text-center align-middle">
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
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
                <div className="d-flex align-items-center gap-2 mt-2">
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setParts([...parts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }])}
                    >
                        Adicionar Peça
                    </button>
                    <div className="btn-group">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                            onClick={handleCopyParts}
                            title="Copiar Peças"
                        >
                            <Copy size={14} /> Copiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                            onClick={handlePasteParts}
                            title="Colar Peças"
                        >
                            <Clipboard size={14} /> Colar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportPartsTable;
