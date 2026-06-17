import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Plus, Package, Eye, Calendar, User, FileText, Search, Truck } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import CreateOrderModal from '../components/Inventory/CreateOrderModal';
import OrderDetailsModal from '../components/Inventory/OrderDetailsModal';
import { format } from 'date-fns';

const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { alert } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['inventory_orders'],
    queryFn: async () => {
      const response = await apiClient.get('/api/inventory/orders');
      console.log('API Response Orders:', response.data);
      return response.data;
    }
  });

  React.useEffect(() => {
    if (error) {
        console.error('Error fetching orders:', error);
    }
  }, [error]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill fw-bold border-0 shadow-none">Pendente</span>;
      case 'PARTIAL': return <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold border-0 shadow-none">Parcial</span>;
      case 'COMPLETED': return <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold border-0 shadow-none">Concluída</span>;
      case 'CANCELLED': return <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill fw-bold border-0 shadow-none">Cancelada</span>;
      default: return <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2 rounded-pill fw-bold border-0 shadow-none">{status}</span>;
    }
  };

  const filteredOrders = orders?.filter((o: any) =>
    o.document_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toString().includes(searchTerm) ||
    `${o.first_name} ${o.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.search_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container-fluid py-4 px-md-5">
        <div className="skeleton skeleton-title" style={{ width: '300px', height: '40px' }}></div>
        <div className="skeleton mb-4 rounded-4" style={{ height: '400px' }}></div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-md-5 animate__animated animate__fadeIn" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
        <div className="d-flex align-items-center gap-3">
          <Truck size={40} strokeWidth={2.5} className="text-primary" />
          <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Encomendas</h1>
        </div>
          <p className="text-muted small m-0 fst-italic">Acompanhamento de encomendas de peças e receção de stock</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 rounded-pill px-4 py-2 shadow-sm fw-semibold transform-active" onClick={() => setShowCreateModal(true)} style={{ transition: 'all 0.2s' }}>
          <Plus size={20} /> Nova Encomenda
        </button>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="glass-panel p-3 rounded-4 shadow-sm border-0 d-flex align-items-center gap-2">
            <Search size={18} className="text-muted ms-2" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none"
              placeholder="Procurar por Nº Doc, ID, Utilizador ou Ref. de Peça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '24px' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr className="bg-dark text-white text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
                <th className="ps-4 py-3 border-0">Referência</th>
                <th className="py-3 border-0">Documento</th>
                <th className="py-3 border-0">Utilizador</th>
                <th className="py-3 border-0">Peças</th>
                <th className="py-3 border-0">Estado</th>
                <th className="text-end pe-4 py-3 border-0">Ação</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {filteredOrders?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted fw-medium">
                    <Package size={48} className="opacity-10 mb-3 d-block mx-auto" />
                    Nenhuma encomenda encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrders?.map((order: any) => (
                  <tr key={order.id} className="border-bottom border-light">
                    <td className="ps-4">
                      <div className="fw-bold text-primary">#{order.id}</div>
                      <div className="small text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                        <Calendar size={10} /> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: '#334155' }}>
                        <FileText size={16} className="text-muted" />
                        {order.document_number}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2 small fw-medium">
                        <div className="bg-secondary bg-opacity-10 p-1 rounded-circle">
                          <User size={12} className="text-secondary" />
                        </div>
                        {order.first_name} {order.last_name || ''}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border-0 px-3 py-2 rounded-pill fw-bold">{order.item_count} <span className="fw-normal opacity-50">itens</span></span>
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-primary border-2 rounded-pill px-3 fw-bold" onClick={() => setSelectedOrderId(order.id)}>
                        <Eye size={16} className="me-1" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory_orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      )}

      {selectedOrderId && (
        <OrderDetailsModal
          isOpen={!!selectedOrderId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory_orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_order_detail', selectedOrderId] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      )}

    </div>
  );
};

export default OrdersPage;
