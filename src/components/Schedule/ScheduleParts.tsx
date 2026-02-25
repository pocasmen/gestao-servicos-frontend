import React from 'react';
import { Trash2, Copy, Clipboard } from 'lucide-react';
import { PartItem } from '../../types';
import { StockType } from '../../constants/enums';

interface SchedulePartsProps {
    parts: PartItem[];
    handlePartChange: (index: number, field: keyof PartItem, value: any) => void;
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
    if (isTicketScheduling) return null;

    return (
        <div className="form-group mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="mb-0 text-secondary fw-bold">Peças a Utilizar</label>
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
                                <td>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        placeholder="Qtd"
                                        value={part.quantity}
                                        onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                        disabled={isPastOrCompleted}
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
                                        disabled={isPastOrCompleted}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Designação"
                                        value={part.designation}
                                        onChange={e => handlePartChange(index, 'designation', e.target.value)}
                                        disabled={part.isDesignationLocked || isPastOrCompleted}
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    <div className="d-flex justify-content-center">
                                        <input
                                            type="checkbox"
                                            className="form-check-input mt-0"
                                            checked={part.isApplied !== false}
                                            onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                            disabled={isPastOrCompleted}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        value={part.stockType || StockType.GENERAL}
                                        onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                        disabled={isPastOrCompleted}
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
                                        disabled={isPastOrCompleted}
                                        title="Remover Peça"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!isPastOrCompleted && (
                    <div className="d-flex align-items-center gap-2 mt-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPart}>
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
                )}
            </div>
        </div>
    );
};

export default ScheduleParts;
