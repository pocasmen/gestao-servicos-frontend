import React from 'react';
import { Part } from '../../types';
import { StockType } from '../../constants/enums';
import { STOCK_TYPE_LABELS } from '../../constants';

interface InventoryStockModalsProps {
    modalType: 'stock' | 'order' | 'receive' | 'add_item' | 'reservations' | null;
    selectedPart: Part | null;
    targetStock: StockType;
    setTargetStock: (val: StockType) => void;
    stockChange: number;
    setStockChange: (val: number) => void;
    orderChange: number;
    setOrderChange: (val: number) => void;
    receiveQuantity: number;
    setReceiveQuantity: (val: number) => void;
    isSubmitting: boolean;
    onClose: () => void;
    onStockChange: () => void;
    onOrderChange: () => void;
    onReceiveOrder: () => void;
}

const InventoryStockModals: React.FC<InventoryStockModalsProps> = ({
    modalType,
    selectedPart,
    targetStock,
    setTargetStock,
    stockChange,
    setStockChange,
    orderChange,
    setOrderChange,
    receiveQuantity,
    setReceiveQuantity,
    isSubmitting,
    onClose,
    onStockChange,
    onOrderChange,
    onReceiveOrder
}) => {
    if (!selectedPart) return null;

    return (
        <>
            {modalType === 'stock' && (
                <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Ajuste Manual de Stock: {selectedPart.designation}</h5>
                                <button type="button" className="btn-close" onClick={onClose}></button>
                            </div>
                            <div className="modal-body">
                                <p>Stock Atual: {targetStock === StockType.FOSS ? selectedPart.stock_quantity_foss : selectedPart.stock_quantity}</p>
                                <div className="mb-3">
                                    <label className="form-label d-block">Canal de Inventário</label>
                                    <div className="btn-group w-100">
                                        <button type="button" className={`btn ${targetStock === StockType.GENERAL ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTargetStock(StockType.GENERAL)}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</button>
                                        <button type="button" className={`btn ${targetStock === StockType.FOSS ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setTargetStock(StockType.FOSS)}>{STOCK_TYPE_LABELS[StockType.FOSS]}</button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="stockChange" className="form-label">Adicionar / Remover Quantidade</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        id="stockChange"
                                        value={stockChange}
                                        onChange={e => setStockChange(parseInt(e.target.value, 10) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={onStockChange} disabled={isSubmitting}>
                                    {isSubmitting ? 'A confirmar...' : 'Confirmar Ajuste'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalType === 'order' && (
                <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Registar Encomenda: {selectedPart.designation}</h5>
                                <button type="button" className="btn-close" onClick={onClose}></button>
                            </div>
                            <div className="modal-body">
                                <p>Encomenda Atual (Pendente): {targetStock === StockType.FOSS ? selectedPart.ordered_quantity_foss : selectedPart.ordered_quantity}</p>
                                <div className="mb-3">
                                    <label className="form-label d-block">Canal de Inventário</label>
                                    <div className="btn-group w-100">
                                        <button type="button" className={`btn ${targetStock === StockType.GENERAL ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTargetStock(StockType.GENERAL)}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</button>
                                        <button type="button" className={`btn ${targetStock === StockType.FOSS ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setTargetStock(StockType.FOSS)}>{STOCK_TYPE_LABELS[StockType.FOSS]}</button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="orderChange" className="form-label">Quantidade Encomendada</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        id="orderChange"
                                        value={orderChange}
                                        min="1"
                                        onChange={e => setOrderChange(parseInt(e.target.value, 10) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={onOrderChange} disabled={isSubmitting}>
                                    {isSubmitting ? 'A registar...' : 'Registar Encomenda'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalType === 'receive' && (
                <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Receber Encomenda: {selectedPart.designation}</h5>
                                <button type="button" className="btn-close" onClick={onClose}></button>
                            </div>
                            <div className="modal-body">
                                <p>Encomenda Atual (Pendente): {targetStock === StockType.FOSS ? selectedPart.ordered_quantity_foss : selectedPart.ordered_quantity}</p>
                                <div className="mb-3">
                                    <label className="form-label d-block">Receber em:</label>
                                    <div className="btn-group w-100">
                                        <button type="button" className={`btn ${targetStock === StockType.GENERAL ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTargetStock(StockType.GENERAL)}>Stock {STOCK_TYPE_LABELS[StockType.GENERAL]}</button>
                                        <button type="button" className={`btn ${targetStock === StockType.FOSS ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setTargetStock(StockType.FOSS)}>Stock {STOCK_TYPE_LABELS[StockType.FOSS]}</button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="receiveQty" className="form-label">Quantidade Recebida</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        id="receiveQty"
                                        value={receiveQuantity}
                                        min="1"
                                        max={targetStock === StockType.FOSS ? selectedPart.ordered_quantity_foss : selectedPart.ordered_quantity}
                                        onChange={e => setReceiveQuantity(parseInt(e.target.value, 10) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={onReceiveOrder} disabled={isSubmitting}>
                                    {isSubmitting ? 'A receber...' : 'Confirmar Entrada'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InventoryStockModals;
