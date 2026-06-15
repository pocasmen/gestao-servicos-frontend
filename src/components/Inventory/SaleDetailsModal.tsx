import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, User, CreditCard, Gift, Trash2, Image as ImageIcon, Trash, ShoppingCart } from 'lucide-react';
import apiClient from '../../apiClient';
import { format } from 'date-fns';
import { useConfirm } from '../../contexts/ConfirmContext';
import logger from '../../utils/logger';

interface SaleDetailsModalProps {
    isOpen: boolean;
    saleId: number;
    onClose: () => void;
    onSuccess?: () => void;
}

const SALE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
    SALE: { label: 'Venda', cls: 'bg-success bg-opacity-10 text-success' },
    GIVEAWAY: { label: 'Oferta', cls: 'bg-info bg-opacity-10 text-info' },
    DISCARD: { label: 'Descarte', cls: 'bg-danger bg-opacity-10 text-danger' },
};

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ isOpen, saleId, onClose, onSuccess }) => {
    const { confirm, alert } = useConfirm();
    const [isDeleting, setIsDeleting] = useState(false);
    const { data: sale, isLoading } = useQuery({
        queryKey: ['inventory_sale_detail', saleId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/inventory/sales/${saleId}`);
            return response.data;
        },
        enabled: !!saleId
    });

    if (!isOpen) return null;

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Eliminar Saída',
            message: `Tem a certeza que deseja eliminar a saída #${sale.id} (${sale.document_number})? Os itens serão repostos no inventário ${sale.stock_type === 'contract' ? 'Foss' : 'Geral'}.`,
            confirmText: 'Sim, Eliminar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (confirmed) {
            setIsDeleting(true);
            try {
                await apiClient.delete(`/api/inventory/sales/${saleId}`);
                onSuccess?.();
                onClose();
            } catch (err: any) {
                alert(`Erro ao eliminar saída: ${err.response?.data?.details || err.message}`);
                logger.error(err, 'Delete Sale error:');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const saleTypeInfo = sale ? (SALE_TYPE_LABELS[sale.sale_type] ?? { label: sale.sale_type, cls: 'bg-secondary bg-opacity-10 text-secondary' }) : null;

    const modalContent = (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050, opacity: 1, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} onClick={!isDeleting ? onClose : undefined} />
            <div className="modal show d-block" style={{ zIndex: 1055 }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                        <div className="modal-header bg-dark text-white border-0 px-4 py-3">
                            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                                <span className="p-2 rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-10 text-white">
                                    <ShoppingCart size={22} />
                                </span>
                                Detalhes da Saída #{saleId}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isDeleting} />
                        </div>

                        <div className="modal-body px-4 py-4 bg-light bg-opacity-50">
                            {isLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status" />
                                    <p className="mt-3 text-muted">A carregar detalhes...</p>
                                </div>
                            ) : sale && (
                                <>
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Nº Documento</div>
                                                <div className="fw-bold text-primary fs-5 m-0" style={{ wordBreak: 'break-word', lineHeight: '1.1' }}>{sale.document_number}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Tipo de Saída</div>
                                                <div>
                                                    {saleTypeInfo && (
                                                        <span className={`badge px-3 py-2 rounded-pill fw-semibold border-0 ${saleTypeInfo.cls} align-self-start d-inline-block`}>{saleTypeInfo.label}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Inventário</div>
                                                <div>
                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-2 fw-bold text-uppercase d-inline-block">
                                                        {sale.stock_type === 'contract' ? 'Foss' : 'Geral'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="rounded-4 p-3 bg-white shadow-sm h-100 d-flex flex-column border border-light">
                                                <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Registado por</div>
                                                <div className="fw-bold text-truncate" style={{ lineHeight: '1.1', fontSize: '0.95rem' }}>{sale.first_name} {sale.last_name || ''}</div>
                                                <div className="small text-muted mt-1" style={{ fontSize: '0.75rem', lineHeight: '1' }}>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {sale.notes && (
                                        <div className="rounded-4 p-3 bg-white shadow-sm mb-4 small text-secondary border border-light">
                                            <span className="fw-bold text-muted me-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas:</span>
                                            {sale.notes}
                                        </div>
                                    )}

                                    <div className="p-3 bg-white border border-light rounded-4 shadow-sm mb-4 text-start">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h6 className="fw-bold text-dark m-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                <i className="bi bi-box-seam me-2 text-primary opacity-50"></i>
                                                Artigos da Saída
                                            </h6>
                                        </div>

                                        <div className="rounded-3 overflow-hidden border border-light shadow-sm bg-white mb-2">
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead className="table-light">
                                                    <tr className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.02em' }}>
                                                        <th className="ps-4 py-2 text-center" style={{ width: '60px' }}>Img</th>
                                                        <th className="py-2 text-center" style={{ width: '80px' }}>Qt</th>
                                                        <th className="py-2" style={{ width: '150px' }}>Referência</th>
                                                        <th className="py-2">Designação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sale.items?.map((item: any) => (
                                                        <tr key={item.id} className="border-bottom border-light">
                                                            <td className="ps-4 py-2 text-center">
                                                                {item.image_path ? (
                                                                    <div className="inventory-photo-container d-inline-block text-start">
                                                                        <img
                                                                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`}
                                                                            className="rounded shadow-sm border p-1"
                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                            alt={item.reference}
                                                                        />
                                                                        <div className="inventory-photo-large shadow-lg rounded overflow-hidden">
                                                                            <img 
                                                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory/${item.image_path}`} 
                                                                                alt={`${item.reference} - Grande`}
                                                                                className="w-100 h-100"
                                                                                style={{ objectFit: 'contain', backgroundColor: '#fff' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-light text-muted border rounded d-flex align-items-center justify-content-center m-auto" style={{ width: '32px', height: '32px' }}>
                                                                        <ImageIcon size={14} />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <span className="badge bg-dark rounded-pill px-3 py-2">{item.quantity}</span>
                                                            </td>
                                                            <td className="py-3 fw-bold text-primary">{item.reference}</td>
                                                            <td className="py-3">
                                                                <div className="fw-medium">{item.designation}</div>
                                                                <div className="small text-muted opacity-50" style={{ fontSize: '0.7rem' }}>{item.original_designation}</div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {sale.items?.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-4 text-muted">Sem itens nesta saída.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer px-4 py-3 bg-light bg-opacity-50 border-top mt-auto d-flex justify-content-between">
                            <button 
                                type="button" 
                                className="btn btn-outline-danger border rounded-pill px-4 fw-medium shadow-sm d-flex align-items-center gap-2" 
                                onClick={handleDelete} 
                                disabled={isDeleting || isLoading}
                            >
                                {isDeleting ? <span className="spinner-border spinner-border-sm" /> : <Trash2 size={16} />} 
                                Eliminar Saída
                            </button>
                            <button type="button" className="btn btn-light border rounded-pill px-4 fw-medium shadow-sm" onClick={onClose} disabled={isDeleting}>
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default SaleDetailsModal;
