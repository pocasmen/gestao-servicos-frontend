import React from 'react';

interface InventoryToolbarProps {
    filter: string;
    setFilter: (val: string) => void;
    view: 'all' | 'low_stock';
    setView: (val: 'all' | 'low_stock') => void;
    onAddItem: () => void;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
    filter,
    setFilter,
    view,
    setView,
    onAddItem
}) => {
    return (
        <div className="row mb-3">
            <div className="col-md-6">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Filtrar por referência ou designação..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>
            <div className="col-md-6 d-flex justify-content-end">
                <button className="btn btn-success me-2" onClick={onAddItem}>Adicionar Item</button>
                <div className="btn-group">
                    <button
                        className={`btn ${view === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setView('all')}
                    >
                        Ver Tudo
                    </button>
                    <button
                        className={`btn ${view === 'low_stock' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setView('low_stock')}
                    >
                        Stock Baixo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryToolbar;
