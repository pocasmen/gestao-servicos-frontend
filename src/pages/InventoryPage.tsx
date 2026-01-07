import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../apiClient';
import { ScheduleEvent, Report } from '../types';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import ReportModal from '../components/ReportModal';

interface PartInventory {
  id: number;
  reference: string;
  designation: string;
  stock_quantity: number;
  reserved_quantity: number;
  ordered_quantity: number;
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<PartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'all' | 'low_stock'>('all');

  const [selectedPart, setSelectedPart] = useState<PartInventory | null>(null);
  const [modalType, setModalType] = useState<'stock' | 'order' | 'receive' | 'add_item' | 'reservations' | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PartInventory, 'id'> & { id?: number }>({ reference: '', designation: '', stock_quantity: 0, reserved_quantity: 0, ordered_quantity: 0 });

  // States for Schedule Detail
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);

  const [stockChange, setStockChange] = useState<number>(0);
  const [orderChange, setOrderChange] = useState<number>(0);
  const [receiveQuantity, setReceiveQuantity] = useState<number>(0);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/inventory');
      setInventory(response.data);
    } catch (err: any) {
      setError('Não foi possível carregar o inventário.');
      console.error('Error fetching inventory:', err.response?.data || err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openModal = (part: PartInventory, type: 'stock' | 'order' | 'receive') => {
    setSelectedPart(part);
    setModalType(type);
    setStockChange(0);
    setOrderChange(0);
    setReceiveQuantity(0);
  };

  const closeModal = () => {
    setSelectedPart(null);
    setModalType(null);
    setNewItem({ reference: '', designation: '', stock_quantity: 0, reserved_quantity: 0, ordered_quantity: 0 });
    setReservations([]);
  };

  const handleOpenScheduleDetail = async (scheduleId: number) => {
    try {
      const response = await apiClient.get(`/api/schedules/${scheduleId}`);
      const schedule = response.data;
      const event: ScheduleEvent = {
        ...schedule,
        start: new Date(schedule.startDate),
        end: new Date(schedule.endDate)
      };
      setSelectedEvent(event);
      setIsScheduleModalOpen(true);
    } catch (err) {
      console.error('Error fetching schedule details:', err);
      alert('Erro ao carregar detalhes do agendamento.');
    }
  };

  const handleCloseScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleScheduleUpdated = useCallback(() => {
    fetchInventory();
    handleCloseScheduleModal();
    // Refresh reservations if modal is open
    if (selectedPart) {
      handleViewReservations(selectedPart);
    }
  }, [fetchInventory, handleCloseScheduleModal, selectedPart]);

  const handleManageReport = useCallback(async (event: ScheduleEvent) => {
    handleCloseScheduleModal();
    setSelectedEvent(event);
    try {
      const response = await apiClient.get<Report>(`/reports/by-schedule/${event.id}`);
      setReportToEdit(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setReportToEdit(null);
      } else {
        console.error("Erro ao verificar relatório existente:", error);
        alert("Não foi possível verificar o relatório do serviço.");
        return;
      }
    }
    setIsReportModalOpen(true);
  }, [handleCloseScheduleModal]);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setSelectedEvent(null);
    setReportToEdit(null);
  }, []);

  const handleReportSaved = useCallback(() => {
    fetchInventory();
    handleCloseReportModal();
    if (selectedPart) {
      handleViewReservations(selectedPart);
    }
  }, [fetchInventory, handleCloseReportModal, selectedPart]);

  const handleAddItem = async () => {
    if (!newItem.reference || !newItem.designation) {
      alert('Referência e Designação são obrigatórias.');
      return;
    }
    try {
      await apiClient.post('/api/inventory', newItem);
      closeModal();
      fetchInventory();
    } catch (err: any) {
      alert(`Erro ao adicionar item: ${err.response?.data?.details || err.message}`);
    }
  };

  const handleStockChange = async () => {
    if (!selectedPart || stockChange === 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/stock`, { quantity: stockChange, fromOrder: false });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      alert('Erro ao ajustar o stock.');
    }
  };

  const handleOrderChange = async () => {
    if (!selectedPart || orderChange <= 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/order`, { quantity: orderChange });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      alert('Erro ao registar a encomenda.');
    }
  };

  const handleReceiveOrder = async () => {
    if (!selectedPart || receiveQuantity <= 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/stock`, { quantity: receiveQuantity, fromOrder: true });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      alert('Erro ao receber a encomenda.');
    }
  };

  const handleViewReservations = async (part: PartInventory) => {
    setSelectedPart(part);
    setModalType('reservations');
    setLoadingReservations(true);
    try {
      const response = await apiClient.get(`/api/inventory/${part.id}/reservations`);
      setReservations(response.data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      alert('Erro ao carregar reservas.');
    } finally {
      setLoadingReservations(false);
    }
  };

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (view === 'low_stock') {
      items = items.filter(p => (p.stock_quantity - p.reserved_quantity) <= 5);
    }
    if (filter) {
      items = items.filter(p =>
        p.designation.toLowerCase().includes(filter.toLowerCase()) ||
        p.reference.toLowerCase().includes(filter.toLowerCase())
      );
    }
    return items;
  }, [inventory, filter, view]);

  if (loading) return <div className="container mt-4">A carregar...</div>;
  if (error) return <div className="container mt-4 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <h1>Gestão de Inventário</h1>

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
          <button className="btn btn-success me-2" onClick={() => setModalType('add_item')}>Adicionar Item</button>
          <div className="btn-group">
            <button className={`btn ${view === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('all')}>Ver Tudo</button>
            <button className={`btn ${view === 'low_stock' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setView('low_stock')}>Stock Baixo</button>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {modalType === 'add_item' && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Novo Item ao Inventário</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="reference" className="form-label">Referência</label>
                  <input
                    type="text"
                    className="form-control"
                    id="reference"
                    value={newItem.reference}
                    onChange={e => setNewItem({ ...newItem, reference: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="designation" className="form-label">Designação</label>
                  <input
                    type="text"
                    className="form-control"
                    id="designation"
                    value={newItem.designation}
                    onChange={e => setNewItem({ ...newItem, designation: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="stock_quantity" className="form-label">Quantidade em Stock</label>
                  <input
                    type="number"
                    className="form-control"
                    id="stock_quantity"
                    value={newItem.stock_quantity}
                    onChange={e => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleAddItem}>Adicionar Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredInventory.length === 0 && !loading ? (
        <div className="alert alert-info">Nenhuma peça encontrada para os filtros selecionados.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Designação</th>
                <th>Referência</th>
                <th className="text-center">Disponível</th>
                <th className="text-center">Reservado</th>
                <th className="text-center">Em Stock</th>
                <th className="text-center">Encomendado</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(part => (
                <tr key={part.id}>
                  <td>{part.designation}</td>
                  <td>{part.reference}</td>
                  <td className="text-center fw-bold">{part.stock_quantity - part.reserved_quantity}</td>
                  <td className="text-center">{part.reserved_quantity}</td>
                  <td className="text-center">{part.stock_quantity}</td>
                  <td className="text-center">{part.ordered_quantity}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-secondary me-1" title="Ajuste Manual de Stock" onClick={() => openModal(part, 'stock')}>
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button className="btn btn-sm btn-warning me-1" title="Registar Encomenda" onClick={() => openModal(part, 'order')}>
                      <i className="bi bi-truck"></i>
                    </button>
                    {part.reserved_quantity > 0 && (
                      <button className="btn btn-sm btn-primary me-1" title="Ver Reservas" onClick={() => handleViewReservations(part)}>
                        <i className="bi bi-calendar-check"></i>
                      </button>
                    )}
                    {part.ordered_quantity > 0 && (
                      <button className="btn btn-sm btn-info" title="Receber Encomenda" onClick={() => openModal(part, 'receive')}>
                        <i className="bi bi-box-arrow-in-down"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Modal */}
      {modalType === 'stock' && selectedPart && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ajuste Manual de Stock: {selectedPart.designation}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Stock Atual: {selectedPart.stock_quantity}</p>
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
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleStockChange}>Confirmar Ajuste</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {modalType === 'order' && selectedPart && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registar Encomenda: {selectedPart.designation}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Quantidade Encomendada Atualmente: {selectedPart.ordered_quantity}</p>
                <div className="mb-3">
                  <label htmlFor="orderChange" className="form-label">Quantidade a Encomendar</label>
                  <input
                    type="number"
                    className="form-control"
                    id="orderChange"
                    value={orderChange}
                    onChange={e => setOrderChange(parseInt(e.target.value, 10) || 0)}
                    min="1"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleOrderChange}>Registar Encomenda</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Order Modal */}
      {modalType === 'receive' && selectedPart && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Receber Encomenda: {selectedPart.designation}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Quantidade Encomendada: {selectedPart.ordered_quantity}</p>
                <div className="mb-3">
                  <label htmlFor="receiveQuantity" className="form-label">Quantidade Recebida</label>
                  <input
                    type="number"
                    className="form-control"
                    id="receiveQuantity"
                    value={receiveQuantity}
                    onChange={e => setReceiveQuantity(parseInt(e.target.value, 10) || 0)}
                    min="1"
                    max={selectedPart.ordered_quantity}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleReceiveOrder}>Confirmar Entrada</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservations Modal */}
      {modalType === 'reservations' && selectedPart && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Itens Reservados: {selectedPart.designation}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                {loadingReservations ? (
                  <p>A carregar reservas...</p>
                ) : reservations.length === 0 ? (
                  <p>Não foram encontradas reservas ativas para este item.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Serviço / Título</th>
                          <th>Data Prevista</th>
                          <th>Cliente</th>
                          <th className="text-center">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((res, index) => (
                          <tr key={index}>
                            <td>
                              <button
                                className="btn btn-link p-0 text-start"
                                style={{ verticalAlign: 'baseline' }}
                                onClick={() => handleOpenScheduleDetail(res.scheduleId)}
                              >
                                {res.title}
                              </button>
                            </td>
                            <td>{new Date(res.startDate).toLocaleDateString()}</td>
                            <td>{res.clientName}</td>
                            <td className="text-center">{res.quantityReserved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalType && <div className="modal-backdrop fade show"></div>}

      {isScheduleModalOpen && (
        <ScheduleDetailModal
          isOpen={isScheduleModalOpen}
          onClose={handleCloseScheduleModal}
          event={selectedEvent}
          onScheduleUpdated={handleScheduleUpdated}
          onManageReport={handleManageReport}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          schedule={selectedEvent}
          reportToEdit={reportToEdit}
          onReportSaved={handleReportSaved}
        />
      )}
    </div>
  );
};

export default InventoryPage;
