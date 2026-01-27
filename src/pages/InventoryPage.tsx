import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../apiClient';
import { ScheduleEvent, Report } from '../types';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import ReportModal from '../components/ReportModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { SmartInput } from '../components/SmartInput';

interface PartInventory {
  id: number;
  reference: string;
  designation: string;
  stock_quantity: number;
  reserved_quantity: number;
  ordered_quantity: number;
  is_composed?: boolean;
}

interface ComponentItem {
  partId: number;
  quantity: number;
  reference?: string;
  designation?: string;
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<PartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'all' | 'low_stock'>('all');
  const { alert } = useConfirm();

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

  // States for Composed Parts
  const [isComposed, setIsComposed] = useState(false);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [compSearchResults, setCompSearchResults] = useState<PartInventory[]>([]);
  const [showCompResults, setShowCompResults] = useState(false);
  const [composedDetails, setComposedDetails] = useState<ComponentItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
    setIsComposed(false);
    setComponents([]);
    setCompSearch('');
    setComposedDetails([]);
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
      await alert('Erro ao carregar detalhes do agendamento.');
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
        await alert("Não foi possível verificar o relatório do serviço.");
        return;
      }
    }
    setIsReportModalOpen(true);
  }, [handleCloseScheduleModal, alert]);

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
      await alert('Referência e Designação são obrigatórias.');
      return;
    }

    if (isComposed && components.length === 0) {
      await alert('Uma peça composta deve ter pelo menos um componente.');
      return;
    }

    try {
      if (isComposed) {
        await apiClient.post('/api/inventory/composed', {
          reference: newItem.reference,
          designation: newItem.designation,
          components: components.map(c => ({ partId: c.partId, quantity: c.quantity }))
        });
      } else {
        await apiClient.post('/api/inventory', newItem);
      }
      closeModal();
      fetchInventory();
    } catch (err: any) {
      await alert(`Erro ao adicionar item: ${err.response?.data?.details || err.message}`);
    }
  };

  const handleCompSearch = (query: string) => {
    setCompSearch(query);
    if (query.length > 1) {
      const results = inventory.filter(p =>
        !p.is_composed &&
        (p.reference.toLowerCase().includes(query.toLowerCase()) ||
          p.designation.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10);
      setCompSearchResults(results);
      setShowCompResults(true);
    } else {
      setShowCompResults(false);
    }
  };

  const addComponent = (part: PartInventory) => {
    if (components.some(c => c.partId === part.id)) {
      setCompSearch('');
      setShowCompResults(false);
      return;
    }
    setComponents([...components, {
      partId: part.id,
      quantity: 1,
      reference: part.reference,
      designation: part.designation
    }]);
    setCompSearch('');
    setShowCompResults(false);
  };

  const removeComponent = (partId: number) => {
    setComponents(components.filter(c => c.partId !== partId));
  };

  const updateComponentQty = (partId: number, qty: number) => {
    setComponents(components.map(c => c.partId === partId ? { ...c, quantity: qty } : c));
  };

  const handleViewDetails = async (part: PartInventory) => {
    setSelectedPart(part);
    setModalType('add_item'); // Reuse modal for view/edit detail
    setIsComposed(true);
    setNewItem({
      reference: part.reference,
      designation: part.designation,
      stock_quantity: part.stock_quantity,
      reserved_quantity: part.reserved_quantity,
      ordered_quantity: part.ordered_quantity,
      id: part.id
    });

    setLoadingDetails(true);
    try {
      const response = await apiClient.get(`/api/inventory/${part.id}/components`);
      setComponents(response.data);
    } catch (err) {
      console.error('Error fetching component details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!newItem.id || !newItem.reference || !newItem.designation) return;

    if (isComposed && components.length === 0) {
      await alert('Uma peça composta deve ter pelo menos um componente.');
      return;
    }

    try {
      if (isComposed) {
        await apiClient.put(`/api/inventory/${newItem.id}/composed`, {
          reference: newItem.reference,
          designation: newItem.designation,
          components: components.map(c => ({ partId: c.partId, quantity: c.quantity }))
        });
      } else {
        // Not implemented for normal items yet, but we could add general update
        await alert('Apenas edição de peças compostas implementada por agora.');
        return;
      }
      closeModal();
      fetchInventory();
    } catch (err: any) {
      await alert(`Erro ao atualizar item: ${err.response?.data?.details || err.message}`);
    }
  };

  const handleStockChange = async () => {
    if (!selectedPart || stockChange === 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/stock`, { quantity: stockChange, fromOrder: false });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      await alert('Erro ao ajustar o stock.');
    }
  };

  const handleOrderChange = async () => {
    if (!selectedPart || orderChange <= 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/order`, { quantity: orderChange });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      await alert('Erro ao registar a encomenda.');
    }
  };

  const handleReceiveOrder = async () => {
    if (!selectedPart || receiveQuantity <= 0) return;
    try {
      await apiClient.put(`/api/inventory/${selectedPart.id}/stock`, { quantity: receiveQuantity, fromOrder: true });
      closeModal();
      fetchInventory();
    } catch (err: any) {
      await alert('Erro ao receber a encomenda.');
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
      await alert('Erro ao carregar reservas.');
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

      {/* Add / Edit Item Modal */}
      {modalType === 'add_item' && (
        <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">
                  {newItem.id ? 'Editar Peça Composta' : 'Adicionar Novo Item ao Inventário'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <SmartInput
                      label="Referência"
                      value={newItem.reference}
                      onChange={(val: string) => setNewItem(prev => ({ ...prev, reference: val }))}
                      options={{
                        blockScripts: true,
                        minLength: 2,
                        maxLength: 50,
                      }}
                      placeholder="Ex: REF-12345"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <SmartInput
                      label="Designação"
                      value={newItem.designation}
                      onChange={(val: string) => setNewItem(prev => ({ ...prev, designation: val }))}
                      options={{
                        blockScripts: true,
                        minLength: 3,
                        maxLength: 100,
                        type: 'text' // triggers default heuristic checks
                      }}
                      placeholder="Ex: Motor Elétrico 500W"
                      required
                    />
                  </div>
                </div>

                {!newItem.id && (
                  <div className="mb-3">
                    <div className="form-check form-switch card p-3 bg-light shadow-sm">
                      <div className="d-flex align-items-center">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="isComposedSwitch"
                          checked={isComposed}
                          onChange={e => setIsComposed(e.target.checked)}
                          style={{ width: '3em', height: '1.5em' }}
                        />
                        <label className="form-check-label fw-bold h5 mb-0" htmlFor="isComposedSwitch">
                          Peça Composta (Kit)
                        </label>
                      </div>
                      <small className="text-muted mt-2">
                        Ative se esta peça for constituída por outras peças do inventário. O stock será calculado automaticamente.
                      </small>
                    </div>
                  </div>
                )}

                {isComposed ? (
                  <div className="card mt-4 border-primary">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Constituição da Peça Composta</h6>
                    </div>
                    <div className="card-body">
                      <div className="position-relative mb-3">
                        <label className="form-label fw-bold">Pesquisar Componentes</label>
                        <div className="input-group">
                          <span className="input-group-text"><i className="bi bi-search"></i></span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Referência ou nome da peça componente..."
                            value={compSearch}
                            onChange={(e) => handleCompSearch(e.target.value)}
                          />
                        </div>

                        {showCompResults && compSearchResults.length > 0 && (
                          <div className="list-group position-absolute w-100 shadow-lg" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                            {compSearchResults.map(part => (
                              <button
                                key={part.id}
                                type="button"
                                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                onClick={() => addComponent(part)}
                              >
                                <div>
                                  <strong>{part.reference}</strong> - {part.designation}
                                </div>
                                <span className="badge bg-info rounded-pill">Stock: {part.stock_quantity - part.reserved_quantity}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Componente</th>
                              <th style={{ width: '100px' }}>Qtd</th>
                              <th style={{ width: '50px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {components.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="text-center py-3 text-muted">
                                  Nenhum componente adicionado.
                                </td>
                              </tr>
                            ) : (
                              components.map(c => (
                                <tr key={c.partId}>
                                  <td>
                                    <strong>{c.reference}</strong><br />
                                    <small className="text-muted">{c.designation}</small>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      min="1"
                                      value={c.quantity}
                                      onChange={(e) => updateComponentQty(c.partId, parseInt(e.target.value) || 1)}
                                    />
                                  </td>
                                  <td>
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeComponent(c.partId)}>
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  !newItem.id && (
                    <div className="mb-3 card p-3">
                      <label htmlFor="stock_quantity" className="form-label fw-bold">Quantidade Inicial em Stock</label>
                      <input
                        type="number"
                        className="form-control"
                        id="stock_quantity"
                        value={newItem.stock_quantity}
                        onChange={e => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                  )
                )}
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                {newItem.id ? (
                  <button type="button" className="btn btn-primary" onClick={handleUpdateItem}>Atualizar Peça</button>
                ) : (
                  <button type="button" className="btn btn-success" onClick={handleAddItem}>Criar Item</button>
                )}
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
                <th className="text-center">Stock Real</th>
                <th className="text-center">Encomendado</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(part => (
                <tr key={part.id}>
                  <td className="align-middle">
                    {part.designation}
                    {part.is_composed && (
                      <span className="badge bg-primary ms-2 shadow-sm" style={{ fontSize: '0.65rem' }}>COMPOSTO</span>
                    )}
                  </td>
                  <td className="align-middle fw-bold text-muted">{part.reference}</td>
                  <td className="text-center align-middle h5 mb-0">
                    <span className={`badge ${(part.stock_quantity - part.reserved_quantity) <= 5 ? 'bg-danger' : 'bg-success'}`}>
                      {part.stock_quantity - part.reserved_quantity}
                    </span>
                  </td>
                  <td className="text-center align-middle">{part.reserved_quantity}</td>
                  <td className="text-center align-middle">{part.is_composed ? '-' : part.stock_quantity}</td>
                  <td className="text-center align-middle">{part.ordered_quantity}</td>
                  <td className="text-center align-middle">
                    {part.is_composed ? (
                      <button className="btn btn-sm btn-outline-primary me-1 shadow-sm" title="Ver/Editar Composição" onClick={() => handleViewDetails(part)}>
                        <i className="bi bi-gear-fill"></i>
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary me-1 shadow-sm" title="Ajuste Manual de Stock" onClick={() => openModal(part, 'stock')}>
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-sm btn-warning me-1 shadow-sm" title="Registar Encomenda" onClick={() => openModal(part, 'order')}>
                          <i className="bi bi-truck"></i>
                        </button>
                      </>
                    )}
                    {part.reserved_quantity > 0 && (
                      <button className="btn btn-sm btn-primary me-1 shadow-sm" title="Ver Reservas" onClick={() => handleViewReservations(part)}>
                        <i className="bi bi-calendar-check text-white"></i>
                      </button>
                    )}
                    {!part.is_composed && part.ordered_quantity > 0 && (
                      <button className="btn btn-sm btn-info shadow-sm" title="Receber Encomenda" onClick={() => openModal(part, 'receive')}>
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
