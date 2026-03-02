import React from 'react';
import { Part } from '../../types';
import { Pencil, Trash2, ArrowUpDown, Truck, Package, CalendarCheck } from 'lucide-react';

interface InventoryTableProps {
    inventory: Part[];
    onOpenModal: (part: Part, type: 'stock' | 'order' | 'receive') => void;
    onEditItem: (part: Part) => void;
    onViewReservations: (part: Part) => void;
    onDelete: (part: Part) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
    inventory,
    onOpenModal,
    onEditItem,
    onViewReservations,
    onDelete
}) => {
    return (
        <div className="table-responsive">
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th>Designação</th>
                        <th>Referência</th>
                        <th className="text-center">Disp. (G)</th>
                        <th className="text-center">Disp. (C)</th>
                        <th className="text-center">Res. (G/C)</th>
                        <th className="text-center">Stock Real (G/C)</th>
                        <th className="text-center">Enc. (G/C)</th>
                        <th className="text-end pe-4">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.map(part => (
                        <tr key={part.id}>
                            <td className="align-middle">
                                {part.designation}
                                {part.is_composed && (
                                    <span className="badge bg-primary ms-2 shadow-sm" style={{ fontSize: '0.65rem' }}>COMPOSTO</span>
                                )}
                            </td>
                            <td className="align-middle fw-bold text-muted">{part.reference}</td>
                            <td className="text-center align-middle">
                                <span className={`badge ${(part.available_quantity ?? 0) <= 5 ? 'bg-danger' : 'bg-success'}`}>
                                    {part.available_quantity ?? 0}
                                </span>
                            </td>
                            <td className="text-center align-middle">
                                <span className={`badge ${(part.available_quantity_foss ?? 0) <= 5 ? 'bg-danger' : 'bg-info'}`}>
                                    {part.available_quantity_foss ?? 0}
                                </span>
                            </td>
                            <td className="text-center align-middle">
                                <span className="text-muted">{part.reserved_quantity || 0}</span> / <span className="text-info">{part.reserved_quantity_foss || 0}</span>
                            </td>
                            <td className="text-center align-middle">
                                {part.is_composed ? '-' : (
                                    <>
                                        <span className="text-muted">{part.raw_stock_quantity || 0}</span> / <span className="text-info">{part.raw_stock_foss || 0}</span>
                                    </>
                                )}
                            </td>
                            <td className="text-center align-middle">
                                <span className="text-muted">{part.ordered_quantity || 0}</span> / <span className="text-info">{part.ordered_quantity_foss || 0}</span>
                            </td>
                            <td className="align-middle">
                                <div className="d-flex justify-content-end gap-1">
                                    {!part.is_composed ? (
                                        <button
                                            className="btn btn-sm btn-secondary shadow-sm"
                                            title="Ajuste Manual de Stock"
                                            onClick={() => onOpenModal(part, 'stock')}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <ArrowUpDown size={18} />
                                        </button>
                                    ) : (
                                        <div style={{ width: '32px', height: '32px' }} />
                                    )}

                                    <button
                                        className="btn btn-sm btn-primary shadow-sm"
                                        title={part.is_composed ? "Editar Peça/Composição" : "Editar Item"}
                                        onClick={() => onEditItem(part)}
                                        style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Pencil size={18} />
                                    </button>

                                    {!part.is_composed ? (
                                        <button
                                            className="btn btn-sm btn-warning shadow-sm"
                                            title="Registar Encomenda"
                                            onClick={() => onOpenModal(part, 'order')}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Truck size={18} />
                                        </button>
                                    ) : (
                                        <div style={{ width: '32px', height: '32px' }} />
                                    )}

                                    {!part.is_composed && (part.ordered_quantity || 0) > 0 ? (
                                        <button
                                            className="btn btn-sm btn-info shadow-sm"
                                            title="Receber Encomenda"
                                            onClick={() => onOpenModal(part, 'receive')}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Package size={18} />
                                        </button>
                                    ) : (
                                        <div style={{ width: '32px', height: '32px' }} />
                                    )}

                                    {(part.reserved_quantity || 0) > 0 || (part.reserved_quantity_foss || 0) > 0 ? (
                                        <button
                                            className="btn btn-sm btn-primary shadow-sm"
                                            title="Ver Reservas"
                                            onClick={() => onViewReservations(part)}
                                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <CalendarCheck size={18} />
                                        </button>
                                    ) : (
                                        <div style={{ width: '32px', height: '32px' }} />
                                    )}

                                    <button
                                        className="btn btn-sm btn-outline-danger shadow-sm"
                                        title="Apagar Item"
                                        onClick={() => onDelete(part)}
                                        style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default InventoryTable;
