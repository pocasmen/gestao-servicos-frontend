import React from 'react';

interface InventoryToolbarProps {
    filter: string;
    setFilter: (val: string) => void;
    onSearch: () => void;
    onReset: () => void;
    view: 'all' | 'low_stock' | 'reserved';
    setView: (val: 'all' | 'low_stock' | 'reserved') => void;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
    filter,
    setFilter,
    onSearch,
    onReset,
    view,
    setView
}) => {
    return (
        <div className="row mb-3 align-items-center">
            <div className="col-auto">
                <div className="input-group" style={{ maxWidth: '800px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Pesquisar..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch()}
                    />
                    {filter && (
                        <button className="btn btn-outline-secondary" type="button" onClick={onReset} title="Limpar pesquisa">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                    <button className="btn btn-primary" type="button" onClick={onSearch} title="Pesquisar">
                        <i className="bi bi-search"></i>
                    </button>
                </div>
            </div>
            <div className="col d-flex justify-content-end align-items-center">
                <div className="btn-group shadow-sm">
                    <button
                        className={`btn ${view === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setView('all')}
                        title="Ver Tudo"
                    >
                        <i className="bi bi-grid-3x3-gap-fill me-1"></i>
                        <span className="d-none d-md-inline">Tudo</span>
                    </button>
                    <button
                        className={`btn ${view === 'reserved' ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => setView('reserved')}
                        title="Itens com Reserva"
                    >
                        <i className="bi bi-calendar-check-fill me-1"></i>
                        <span className="d-none d-md-inline">Reservas</span>
                    </button>
                    <button
                        className={`btn ${view === 'low_stock' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setView('low_stock')}
                        title="Stock Baixo"
                    >
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        <span className="d-none d-md-inline">Avisos</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryToolbar;
