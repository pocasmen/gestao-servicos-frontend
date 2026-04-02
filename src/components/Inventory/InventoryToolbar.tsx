import React from 'react';
import { Search, X } from 'lucide-react';

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
        <div className="glass-card border-0 mb-4 overflow-hidden shadow-sm">
            <div className="p-3">
                <div className="row g-3 align-items-center">
                    <div className="col-md-7">
                        <div className="input-group shadow-sm rounded-pill overflow-hidden border bg-white ps-3">
                            <span className="bg-transparent border-0 d-flex align-items-center text-muted pe-2">
                                <Search size={18} />
                            </span>
                            <input
                                type="text"
                                className="form-control border-0 bg-transparent py-2 px-1"
                                placeholder="Pesquisar por referência ou designação..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && onSearch()}
                                style={{ boxShadow: 'none' }}
                            />
                            {filter && (
                                <button className="btn btn-link text-muted border-0 p-2" type="button" onClick={onReset} title="Limpar pesquisa">
                                    <X size={18} />
                                </button>
                            )}
                            <button className="btn btn-primary px-4 fw-bold shadow-none" type="button" onClick={onSearch} title="Pesquisar">
                                Pesquisar
                            </button>
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="d-flex justify-content-md-end gap-2">
                            <div className="btn-group shadow-sm rounded-pill overflow-hidden border p-1 bg-white" style={{ height: '46px' }}>
                                <button
                                    className={`btn btn-sm border-0 rounded-pill px-4 fw-bold ${view === 'all' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted'}`}
                                    onClick={() => setView('all')}
                                >
                                    Ver Tudo
                                </button>
                                <button
                                    className={`btn btn-sm border-0 rounded-pill px-4 fw-bold ${view === 'reserved' ? 'btn-warning text-white shadow-sm' : 'btn-light text-muted'}`}
                                    onClick={() => setView('reserved')}
                                >
                                    Reserva
                                </button>
                                <button
                                    className={`btn btn-sm border-0 rounded-pill px-4 fw-bold ${view === 'low_stock' ? 'btn-danger text-white shadow-sm' : 'btn-light text-muted'}`}
                                    onClick={() => setView('low_stock')}
                                >
                                    Avisos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryToolbar;
