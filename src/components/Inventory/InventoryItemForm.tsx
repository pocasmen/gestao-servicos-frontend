import React from 'react';
import { Part } from '../../types';
import { SmartInput } from '../SmartInput';

export interface ComponentItem {
    partId: number;
    quantity: number;
    reference?: string;
    designation?: string;
    currentStock?: number;
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
            {newItem.image_path && (
                <div className="mb-4 text-center">
                    <img 
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${newItem.image_path}`} 
                        alt={newItem.reference}
                        className="rounded shadow-sm border p-1"
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', backgroundColor: '#fff' }}
                    />
                </div>
            )}
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

            <div className="row">
                <div className="col-md-12 mb-3">
                    <label className="form-label fw-bold small text-muted">Preço (€)</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light border-end-0">€</span>
                        <input
                            type="number"
                            className="form-control form-control-sm border-start-0"
                            placeholder="0,00"
                            step="0.01"
                            value={newItem.price ?? ''}
                            onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        />
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold small text-muted">Stock Mínimo (Geral)</label>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="0"
                        value={newItem.min_stock ?? 0}
                        onChange={(e) => setNewItem(prev => ({ ...prev, min_stock: parseInt(e.target.value, 10) || 0 }))}
                    />
                </div>
                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold small text-muted">Stock Mínimo (FOSS)</label>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="0"
                        value={newItem.min_stock_foss ?? 0}
                        onChange={(e) => setNewItem(prev => ({ ...prev, min_stock_foss: parseInt(e.target.value, 10) || 0 }))}
                    />
                </div>
            </div>

            <div className="mb-3">
                <label className="form-label fw-bold small text-muted">Notas</label>
                <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    placeholder="Notas internas sobre este item..."
                    value={newItem.notes ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                />
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
                                        <th style={{ width: '120px' }}>Stock Atual</th>
                                        <th style={{ width: '100px' }}>Qtd</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-3 text-muted">
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
                                                    {c.currentStock !== undefined ? (
                                                        <span className={`badge ${
                                                            c.currentStock <= 0 ? 'bg-danger' :
                                                            c.currentStock < c.quantity ? 'bg-warning text-dark' :
                                                            'bg-success'
                                                        }`}>
                                                            {c.currentStock}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">—</span>
                                                    )}
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
            <div className="glass-card border-0 mb-4 overflow-hidden shadow-sm animate__animated animate__fadeIn">
                <div className="bg-dark px-4 py-3">
                    <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Novo Item de Inventário</h5>
                </div>
                <div className="p-4">
                    {content}
                    <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="button" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={onSubmit} disabled={isSubmitting}>
                            {isSubmitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                            {isSubmitting ? 'A criar...' : 'Criar Item'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn w-100" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                            {newItem.id ? (isComposed ? 'Editar Peça Composta' : 'Editar Item') : 'Adicionar Novo Item'}
                        </h5>
                        <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                    </div>
                    <div className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        {content}
                    </div>
                    <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2 flex-shrink-0">
                        <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="button" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={onSubmit} disabled={isSubmitting}>
                            {isSubmitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                            {isSubmitting ? (newItem.id ? 'A atualizar...' : 'A criar...') : (newItem.id ? 'Atualizar Peça' : 'Criar Item')}
                        </button>
                    </div>
            </div>
        </div>
    );
};

export default InventoryItemForm;
