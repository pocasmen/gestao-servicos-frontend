import React from 'react';
import { Part } from '../../types';
import { SmartInput } from '../SmartInput';

export interface ComponentItem {
    partId: number;
    quantity: number;
    reference?: string;
    designation?: string;
}

interface InventoryItemFormProps {
    newItem: Omit<Part, 'id'> & { id?: number };
    setNewItem: React.Dispatch<React.SetStateAction<Omit<Part, 'id'> & { id?: number }>>;
    isComposed: boolean;
    setIsComposed: (val: boolean) => void;
    components: ComponentItem[];
    compSearch: string;
    setCompSearch: (val: string) => void;
    handleCompSearch: (query: string) => void;
    compSearchResults: Part[];
    showCompResults: boolean;
    addComponent: (part: Part) => void;
    removeComponent: (partId: number) => void;
    updateComponentQty: (partId: number, qty: number) => void;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: () => void;
    isInline?: boolean;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
    newItem,
    setNewItem,
    isComposed,
    setIsComposed,
    components,
    compSearch,
    setCompSearch,
    handleCompSearch,
    compSearchResults,
    showCompResults,
    addComponent,
    removeComponent,
    updateComponentQty,
    isSubmitting,
    onClose,
    onSubmit,
    isInline = false
}) => {
    const content = (
        <>
            <div className="row">
                <div className="col-md-6 mb-3">
                    <SmartInput
                        label="Referência"
                        value={newItem.reference}
                        onChange={(val: string) => setNewItem(prev => ({ ...prev, reference: val }))}
                        options={{
                            blockScripts: true,
                            minLength: 2,
                            maxLength: 50,
                            disableHeuristics: true,
                        }}
                        placeholder="Ex: REF-12345"
                        required
                    />
                </div>
                <div className="col-md-6 mb-3">
                    <SmartInput
                        label="Designação"
                        value={newItem.designation}
                        onChange={(val: string) => setNewItem(prev => ({ ...prev, designation: val }))}
                        options={{
                            blockScripts: true,
                            minLength: 3,
                            maxLength: 100,
                            type: 'text'
                        }}
                        placeholder="Ex: Motor Elétrico 500W"
                        required
                    />
                </div>
            </div>

            {!newItem.id && (
                <div className="mb-3">
                    <div className="form-check form-switch card p-3 bg-light shadow-sm">
                        <div className="d-flex align-items-center">
                            <input
                                className="form-check-input ms-0 me-3"
                                type="checkbox"
                                id="isComposedSwitch"
                                checked={isComposed}
                                onChange={e => setIsComposed(e.target.checked)}
                                style={{ width: '3em', height: '1.5em' }}
                            />
                            <label className="form-check-label fw-bold h5 mb-0" htmlFor="isComposedSwitch">
                                Peça Composta (Kit)
                            </label>
                        </div>
                        <small className="text-muted mt-2">
                            Ative se esta peça for constituída por outras peças do inventário. O stock será calculado automaticamente.
                        </small>
                    </div>
                </div>
            )}

            {isComposed ? (
                <div className="card mt-4 border-primary">
                    <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">Constituição da Peça Composta</h6>
                    </div>
                    <div className="card-body">
                        <div className="position-relative mb-3">
                            <label className="form-label fw-bold">Pesquisar Componentes</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Referência ou nome da peça componente..."
                                    value={compSearch}
                                    onChange={(e) => setCompSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCompSearch(compSearch)}
                                />
                                <button className="btn btn-outline-secondary" type="button" onClick={() => handleCompSearch(compSearch)}>
                                    <i className="bi bi-search"></i>
                                </button>
                            </div>

                            {showCompResults && compSearchResults.length > 0 && (
                                <div className="list-group position-absolute w-100 shadow-lg" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                    {compSearchResults.map(part => (
                                        <button
                                            key={part.id}
                                            type="button"
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                            onClick={() => addComponent(part)}
                                        >
                                            <div>
                                                <strong>{part.reference}</strong> - {part.designation}
                                            </div>
                                            <span className="badge bg-info rounded-pill">Stock: {(part.stock_quantity || 0) - (part.reserved_quantity || 0)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Componente</th>
                                        <th style={{ width: '100px' }}>Qtd</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-3 text-muted">
                                                Nenhum componente adicionado.
                                            </td>
                                        </tr>
                                    ) : (
                                        components.map(c => (
                                            <tr key={c.partId}>
                                                <td>
                                                    <strong>{c.reference}</strong><br />
                                                    <small className="text-muted">{c.designation}</small>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        min="1"
                                                        value={c.quantity}
                                                        onChange={(e) => updateComponentQty(c.partId, parseInt(e.target.value) || 1)}
                                                    />
                                                </td>
                                                <td>
                                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeComponent(c.partId)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                !newItem.id && (
                    <div className="mb-3 card p-3 border-0 bg-light">
                        <label htmlFor="stock_quantity" className="form-label fw-bold">Quantidade Inicial em Stock</label>
                        <input
                            type="number"
                            className="form-control"
                            id="stock_quantity"
                            value={newItem.stock_quantity}
                            onChange={e => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                        />
                    </div>
                )
            )}
        </>
    );

    if (isInline) {
        return (
            <div className="card mb-4 border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="card-header bg-primary text-white py-3">
                    <h5 className="mb-0">Novo Item de Inventário</h5>
                </div>
                <div className="card-body p-4">
                    {content}
                    <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                        <button type="button" className="btn btn-secondary me-2" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="button" className="btn btn-success px-4" onClick={onSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'A criar...' : 'Criar Item'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <div className="modal-header bg-dark text-white py-3">
                        <h5 className="modal-title fw-bold">
                            {newItem.id ? (isComposed ? 'Editar Peça Composta' : 'Editar Item') : 'Adicionar Novo Item'}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        {content}
                    </div>
                    <div className="modal-footer bg-light p-3">
                        <button type="button" className="btn btn-secondary px-4" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="button" className="btn btn-primary px-4" onClick={onSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (newItem.id ? 'A atualizar...' : 'A criar...') : (newItem.id ? 'Atualizar Peça' : 'Criar Item')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryItemForm;
