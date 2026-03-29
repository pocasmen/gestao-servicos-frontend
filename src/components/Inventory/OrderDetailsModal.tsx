import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Package, ArrowRight, ClipboardCheck } from 'lucide-react';
import apiClient from '../../apiClient';
import { useQuery } from '@tanstack/react-query';
import { useConfirm } from '../../contexts/ConfirmContext';
import logger from '../../utils/logger';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
    isOpen: boolean;
    orderId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pendente', cls: 'bg-warning bg-opacity-10 text-warning' },
    PARTIAL: { label: 'Entrega Parcial', cls: 'bg-info bg-opacity-10 text-info' },
    COMPLETED: { label: 'Concluída', cls: 'bg-success bg-opacity-10 text-success' },
    CANCELLED: { label: 'Cancelada', cls: 'bg-danger bg-opacity-10 text-danger' },
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, orderId, onClose, onSuccess }) => {
    const { alert, confirm } = useConfirm();
    const [receivingQtys, setReceivingQtys] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: order, isLoading } = useQuery({
        queryKey: ['inventory_order_detail', orderId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/inventory/orders/${orderId}`);
            return res.data;
        },
        enabled: isOpen,
        staleTime: 0,           // never use cached data
        refetchOnMount: 'always', // always re-fetch when the component mounts
    });

    useEffect(() => {
        if (order?.items) {
            const init: Record<number, number> = {};
            order.items.forEach((item: any) => {
                init[item.id] = Math.max(0, item.quantity_ordered - item.quantity_received);
            });
            setReceivingQtys(init);
        }
    }, [order]);

    const handleReceive = async () => {
        const itemsToReceive = Object.entries(receivingQtys)
            .filter(([, qty]) => qty > 0)
            .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: qty }));

        if (itemsToReceive.length === 0) return alert('Indique a quantidade recebida para pelo menos uma peça.');

        const ok = await confirm({
            title: 'Confirmar Entrada de Stock',
            message: 'Esta operação irá adicionar as quantidades ao stock físico e registar a transação no ledger. Deseja continuar?',
            confirmText: 'Confirmar Receção',
            variant: 'primary',
        });
        if (!ok) return;

        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/inventory/orders/${orderId}/receive`, { items: itemsToReceive });
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(`Erro ao processar receção: ${err.response?.data?.details || err.message}`);
            logger.error(err, 'Receive order items error:');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const statusInfo = order ? (STATUS_LABELS[order.status] ?? { label: order.status, cls: 'bg-secondary bg-opacity-10 text-secondary' }) : null;
    const hasReceivable = Object.values(receivingQtys).some(q => q > 0);

    const modalContent = (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop fade show"
                style={{ zIndex: 1050 }}
                onClick={!isSubmitting ? onClose : undefined}
            />
            {/* Modal */}
            <div className="modal show d-block" style={{ zIndex: 1055 }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>

                        {/* Header */}
                        <div className="modal-header border-0 px-4 pt-4 pb-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'Montserrat, sans-serif', color: '#111827' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-secondary bg-opacity-10 text-dark">
                                    <Package size={22} />
                                </span>
                                Encomenda #{orderId}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} />
                        </div>

                        {/* Body */}
                        <div className="modal-body px-4 py-3 bg-light bg-opacity-50">
                            {isLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status" />
                                    <p className="mt-3 text-muted">A carregar detalhes...</p>
                                </div>
                            ) : order && (
                                <>
                                    {/* Summary row */}
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-4">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100">
                                                <div className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Nº Documento</div>
                                                <div className="fw-bold text-primary fs-5 m-0">{order.document_number}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column justify-content-between">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Estado</div>
                                                {statusInfo && (
                                                    <span className={`badge px-3 py-2 rounded-pill fw-semibold border-0 ${statusInfo.cls}`}>{statusInfo.label}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100">
                                                <div className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Registado por</div>
                                                <div className="fw-semibold">{order.first_name} {order.last_name || ''}</div>
                                                <div className="small text-muted">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div className="rounded-4 p-3 bg-white shadow-sm mb-4 small text-secondary border-0">
                                            <span className="fw-bold text-muted me-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas:</span>
                                            {order.notes}
                                        </div>
                                    )}

                                    {/* Items table */}
                                    <div className="rounded-4 overflow-hidden border border-light shadow-sm bg-white">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr className="text-uppercase small fw-bold text-muted">
                                                    <th className="ps-4">Peça</th>
                                                    <th className="text-center" style={{ width: '80px' }}>Enc.</th>
                                                    <th className="text-center" style={{ width: '80px' }}>Rec.</th>
                                                    <th className="text-center bg-primary bg-opacity-10" style={{ width: '130px' }}>
                                                        <span className="text-primary fw-bold">A Receber</span>
                                                    </th>
                                                    <th className="pe-4 text-center" style={{ width: '90px' }}>Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items?.map((item: any) => {
                                                    const done = item.quantity_received >= item.quantity_ordered;
                                                    return (
                                                        <tr key={item.id} className={done ? 'bg-success bg-opacity-5' : 'border-bottom border-light'}>
                                                            <td className="ps-4 py-3">
                                                                <div className="fw-semibold">{item.reference}</div>
                                                                <div className="small text-muted text-truncate" style={{ maxWidth: '260px' }}>
                                                                    {item.designation || item.original_designation}
                                                                </div>
                                                            </td>
                                                            <td className="text-center fw-medium">{item.quantity_ordered}</td>
                                                            <td className={`text-center fw-bold ${item.quantity_received > 0 ? 'text-success' : 'text-muted opacity-50'}`}>
                                                                {item.quantity_received}
                                                            </td>
                                                            <td className="text-center bg-primary bg-opacity-10 py-2">
                                                                {done ? (
                                                                    <span className="badge bg-success bg-opacity-10 text-success border-0 rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-1">
                                                                        <CheckCircle size={13} /> OK
                                                                    </span>
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-center fw-bold border-0 bg-white shadow-sm mx-auto py-2"
                                                                        style={{ width: '80px', borderRadius: '8px' }}
                                                                        value={receivingQtys[item.id] ?? 0}
                                                                        onChange={e => setReceivingQtys(prev => ({ ...prev, [item.id]: Math.min(parseInt(e.target.value) || 0, item.quantity_ordered - item.quantity_received) }))}
                                                                        max={item.quantity_ordered - item.quantity_received}
                                                                        min={0}
                                                                        disabled={isSubmitting}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="pe-4 text-center">
                                                                <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1 small fw-bold text-uppercase">
                                                                    {item.stock_type}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer border-0 px-4 py-3">
                            <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>
                                Sair
                            </button>
                            {order && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                                <button
                                    type="button"
                                    className="btn btn-primary rounded-pill px-5 fw-semibold d-flex align-items-center gap-2"
                                    onClick={handleReceive}
                                    disabled={isSubmitting || !hasReceivable}
                                >
                                    {isSubmitting ? <span className="spinner-border spinner-border-sm" /> : <ClipboardCheck size={17} />}
                                    Registar Receção
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default OrderDetailsModal;
