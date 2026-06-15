import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Plus, ShoppingCart, Eye, Calendar, User, FileText, Search, CreditCard, Gift, Trash2 } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { format } from 'date-fns';
import CreateSaleModal from '../components/Inventory/CreateSaleModal';
import SaleDetailsModal from '../components/Inventory/SaleDetailsModal';

const SalesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { alert } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: sales, isLoading } = useQuery({
    queryKey: ['inventory_sales'],
    queryFn: async () => {
      const response = await apiClient.get('/api/inventory/sales');
      return response.data;
    }
  });

  const getSaleTypeBadge = (type: string) => {
    switch (type) {
      case 'SALE': 
        return <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold border-0 shadow-none d-flex align-items-center gap-1"><CreditCard size={12}/> Venda</span>;
      case 'GIVEAWAY': 
        return <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold border-0 shadow-none d-flex align-items-center gap-1"><Gift size={12}/> Oferta</span>;
      case 'DISCARD': 
        return <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill fw-bold border-0 shadow-none d-flex align-items-center gap-1"><Trash2 size={12}/> Descarte</span>;
      default: 
        return <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2 rounded-pill fw-bold border-0 shadow-none">{type}</span>;
    }
  };

  const filteredSales = sales?.filter((s: any) =>
    s.document_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toString().includes(searchTerm) ||
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
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
            <ShoppingCart size={40} strokeWidth={2.5} className="text-primary" />
            <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Vendas e Saídas</h1>
          </div>
          <p className="text-muted small m-0 fst-italic">Registo de vendas diretas, ofertas e descartes de material</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 rounded-pill px-4 py-2 shadow-sm fw-semibold transform-active" onClick={() => setShowCreateModal(true)} style={{ transition: 'all 0.2s' }}>
          <Plus size={20} /> Nova Venda/Saída
        </button>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="glass-panel p-3 rounded-4 shadow-sm border-0 d-flex align-items-center gap-2">
            <Search size={18} className="text-muted ms-2" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none"
              placeholder="Procurar por Nº Doc, ID ou Utilizador..."
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
                <th className="ps-4 py-3 border-0">Data / ID</th>
                <th className="py-3 border-0">Documento</th>
                <th className="py-3 border-0">Tipo</th>
                <th className="py-3 border-0">Utilizador</th>
                <th className="py-3 border-0">Peças</th>
                <th className="text-end pe-4 py-3 border-0">Ação</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {filteredSales?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted fw-medium">
                    <ShoppingCart size={48} className="opacity-10 mb-3 d-block mx-auto" />
                    Nenhuma venda ou saída encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales?.map((sale: any) => (
                  <tr key={sale.id} className="border-bottom border-light">
                    <td className="ps-4">
                      <div className="fw-bold text-primary">#{sale.id}</div>
                      <div className="small text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                        <Calendar size={10} /> {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: '#334155' }}>
                        <FileText size={16} className="text-muted" />
                        {sale.document_number}
                      </div>
                    </td>
                    <td>{getSaleTypeBadge(sale.sale_type)}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2 small fw-medium">
                        <div className="bg-secondary bg-opacity-10 p-1 rounded-circle">
                          <User size={12} className="text-secondary" />
                        </div>
                        {sale.first_name} {sale.last_name || ''}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border-0 px-3 py-2 rounded-pill fw-bold">{sale.item_count} <span className="fw-normal opacity-50">itens</span></span>
                    </td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-primary border-2 rounded-pill px-3 fw-bold" onClick={() => setSelectedSaleId(sale.id)}>
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
        <CreateSaleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory_sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      )}

      {selectedSaleId && (
        <SaleDetailsModal
          isOpen={!!selectedSaleId}
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory_sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_sale_detail', selectedSaleId] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      )}

    </div>
  );
};

export default SalesPage;
