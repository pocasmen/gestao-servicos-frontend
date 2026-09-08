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
    stockNotes?: string;
    setStockNotes?: (val: string) => void;
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

const OVERLAY_STYLE: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
};

const CARD_STYLE: React.CSSProperties = {
    maxWidth: '500px', width: '100%', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
};

// Standard footer used in all modals
const ModalFooter: React.FC<{
    onClose: () => void;
    isSubmitting: boolean;
    disabled?: boolean;
    confirmLabel: string;
    loadingLabel: string;
    confirmClass?: string;
    onConfirm: () => void;
}> = ({ onClose, isSubmitting, disabled, confirmLabel, loadingLabel, confirmClass = 'btn-primary', onConfirm }) => (
    <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2 flex-shrink-0">
        <button
            type="button"
            className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium"
            onClick={onClose}
            disabled={isSubmitting}
        >
            Cancelar
        </button>
        <button
            type="button"
            className={`btn ${confirmClass} rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2`}
            onClick={onConfirm}
            disabled={isSubmitting || disabled}
        >
            {isSubmitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
            {isSubmitting ? loadingLabel : confirmLabel}
        </button>
    </div>
);

const InventoryStockModals: React.FC<InventoryStockModalsProps> = ({
    modalType,
    selectedPart,
    targetStock,
    setTargetStock,
    stockChange,
    setStockChange,
    stockNotes = '',
    setStockNotes,
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
                <div style={OVERLAY_STYLE}>
                    <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn" style={CARD_STYLE}>
                        <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                Ajuste de Stock: {selectedPart.designation}
                            </h5>
                            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                        </div>
                        <div className="p-4" style={{ overflowY: 'auto' }}>
                            <p className="mb-4 text-muted fw-medium d-flex align-items-center justify-content-between border-bottom pb-2">
                                <span>Stock Atual:</span>
                                <span className="fw-bold fs-6 text-dark">
                                    {targetStock === StockType.FOSS ? selectedPart.stock_quantity_foss : selectedPart.stock_quantity}
                                </span>
                            </p>
                            <div className="mb-3">
                                <label className="form-label d-block">Canal de Inventário</label>
                                <div className="btn-group w-100">
                                    <button type="button" className={`btn ${targetStock === StockType.GENERAL ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTargetStock(StockType.GENERAL)}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</button>
                                    <button type="button" className={`btn ${targetStock === StockType.FOSS ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setTargetStock(StockType.FOSS)}>{STOCK_TYPE_LABELS[StockType.FOSS]}</button>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="stockChange" className="form-label">Adicionar / Remover Quantidade</label>
                                <input type="number" className="form-control" id="stockChange" value={stockChange} onChange={e => setStockChange(parseInt(e.target.value, 10) || 0)} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="stockNotes" className="form-label d-flex justify-content-between align-items-center">
                                    <span>Justificação <span className="text-danger">*</span></span>
                                    <small className="text-muted">Obrigatório</small>
                                </label>
                                <textarea
                                    className={`form-control ${!stockNotes.trim() && stockChange !== 0 ? 'is-invalid' : ''}`}
                                    id="stockNotes"
                                    rows={3}
                                    placeholder="Indique o motivo deste ajuste (ex: contagem de inventário, quebra, acerto de fornecedor...)"
                                    value={stockNotes}
                                    onChange={e => setStockNotes && setStockNotes(e.target.value)}
                                    required
                                />
                                {!stockNotes.trim() && stockChange !== 0 && (
                                    <div className="invalid-feedback">
                                        A justificação é obrigatória para efetuar o ajuste.
                                    </div>
                                )}
                            </div>
                        </div>
                        <ModalFooter
                            onClose={onClose}
                            isSubmitting={isSubmitting}
                            disabled={stockChange === 0 || !stockNotes.trim()}
                            onConfirm={onStockChange}
                            confirmLabel="Confirmar Ajuste"
                            loadingLabel="A confirmar..."
                            confirmClass="btn-primary"
                        />
                    </div>
                </div>
            )}

            {modalType === 'order' && (
                <div style={OVERLAY_STYLE}>
                    <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn" style={CARD_STYLE}>
                        <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                Registar Encomenda: {selectedPart.designation}
                            </h5>
                            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                        </div>
                        <div className="p-4" style={{ overflowY: 'auto' }}>
                            <p className="mb-4 text-muted fw-medium d-flex align-items-center justify-content-between border-bottom pb-2">
                                <span>Encomenda Atual (Pendente):</span>
                                <span className="fw-bold fs-6 text-dark">
                                    {targetStock === StockType.FOSS ? selectedPart.ordered_quantity_foss : selectedPart.ordered_quantity}
                                </span>
                            </p>
                            <div className="mb-3">
                                <label className="form-label d-block">Canal de Inventário</label>
                                <div className="btn-group w-100">
                                    <button type="button" className={`btn ${targetStock === StockType.GENERAL ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTargetStock(StockType.GENERAL)}>{STOCK_TYPE_LABELS[StockType.GENERAL]}</button>
                                    <button type="button" className={`btn ${targetStock === StockType.FOSS ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setTargetStock(StockType.FOSS)}>{STOCK_TYPE_LABELS[StockType.FOSS]}</button>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="orderChange" className="form-label">Quantidade Encomendada</label>
                                <input type="number" className="form-control" id="orderChange" value={orderChange} min="1" onChange={e => setOrderChange(parseInt(e.target.value, 10) || 0)} />
                            </div>
                        </div>
                        <ModalFooter
                            onClose={onClose}
                            isSubmitting={isSubmitting}
                            onConfirm={onOrderChange}
                            confirmLabel="Registar Encomenda"
                            loadingLabel="A registar..."
                            confirmClass="btn-warning text-dark"
                        />
                    </div>
                </div>
            )}

            {modalType === 'receive' && (() => {
                const currentOrdered = targetStock === StockType.FOSS
                    ? (selectedPart.ordered_quantity_foss || 0)
                    : (selectedPart.ordered_quantity || 0);
                return (
                    <div style={OVERLAY_STYLE}>
                        <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn" style={CARD_STYLE}>
                            <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                    Receber Encomenda: {selectedPart.designation}
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                            </div>
                            <div className="p-4" style={{ overflowY: 'auto' }}>
                                <p className="mb-4 text-muted fw-medium d-flex align-items-center justify-content-between border-bottom pb-2">
                                    <span>Encomenda Atual (Pendente):</span>
                                    <strong className="fw-bold fs-6 text-dark">{currentOrdered}</strong>
                                </p>
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
                                        min="0"
                                        max={currentOrdered}
                                        onChange={e => setReceiveQuantity(parseInt(e.target.value, 10) || 0)}
                                        disabled={currentOrdered === 0}
                                    />
                                    {currentOrdered === 0 && (
                                        <small className="text-danger d-block mt-1">Não existem encomendas pendentes neste canal.</small>
                                    )}
                                    {receiveQuantity > currentOrdered && currentOrdered > 0 && (
                                        <small className="text-danger d-block mt-1">
                                            A quantidade não pode exceder o valor encomendado ({currentOrdered}).
                                        </small>
                                    )}
                                </div>
                            </div>
                            <ModalFooter
                                onClose={onClose}
                                isSubmitting={isSubmitting}
                                disabled={receiveQuantity <= 0 || receiveQuantity > currentOrdered}
                                onConfirm={onReceiveOrder}
                                confirmLabel="Confirmar Entrada"
                                loadingLabel="A receber..."
                                confirmClass="btn-info text-white"
                            />
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default InventoryStockModals;
