import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ScheduleEvent, Report, Part } from '../types';
import { PartSchema } from '../schemas';
import { StockType } from '../constants/enums';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import ReportModal from '../components/ReportModal';
import { useConfirm } from '../contexts/ConfirmContext';

import InventoryToolbar from '../components/Inventory/InventoryToolbar';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryItemForm, { ComponentItem } from '../components/Inventory/InventoryItemForm';
import InventoryStockModals from '../components/Inventory/InventoryStockModals';
import InventoryReservationsModal from '../components/Inventory/InventoryReservationsModal';
import { supabase } from '../supabase';
import logger from '../utils/logger';
import { Plus, X } from 'lucide-react';

const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'low_stock' | 'reserved'>('all');
  const { confirm, alert } = useConfirm();

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [modalType, setModalType] = useState<'stock' | 'order' | 'receive' | 'add_item' | 'reservations' | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [page, setPage] = useState(1);
  const [newItem, setNewItem] = useState<Omit<Part, 'id'> & { id?: number }>({
    reference: '',
    designation: '',
    stock_quantity: 0,
    reserved_quantity: 0,
    ordered_quantity: 0,
    stock_quantity_foss: 0,
    reserved_quantity_foss: 0,
    ordered_quantity_foss: 0
  });

  // Queries
  const { data: inventoryData, isLoading: loading } = useQuery({
    queryKey: ['inventory', page, search],
    queryFn: async () => {
      const response = await apiClient.get(`/api/inventory?page=${page}&limit=100&search=${encodeURIComponent(search)}`);
      let rawData: unknown[] = [];
      let pagination = { page: 1, limit: 100, total: 0, totalPages: 1 };

      if (response.data && response.data.data) {
        rawData = response.data.data;
        pagination = response.data.pagination;
      } else {
        rawData = response.data;
      }

      const validatedData = rawData.map(item => {
        const result = PartSchema.safeParse(item);
        if (!result.success) {
          logger.error(result.error.format(), '[SCHEMA_ERROR] Invalid part data:');
          return item as Part;
        }
        return result.data as Part;
      }) as Part[];

      return { items: validatedData, pagination };
    }
  });

  const inventory = inventoryData?.items || [];
  const pagination = inventoryData?.pagination || { page: 1, limit: 100, total: 0, totalPages: 1 };

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('inventory_updates')
      .on('broadcast', { event: 'schedule_changed' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_parts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (data: any) => data.isComposed
      ? apiClient.post('/api/inventory/composed', data)
      : apiClient.post('/api/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    },
    onError: (err: any) => {
      alert(`Erro ao adicionar item: ${err.response?.data?.details || err.message}`);
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: any) => data.isComposed
      ? apiClient.put(`/api/inventory/${data.id}/composed`, data)
      : apiClient.put(`/api/inventory/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    },
    onError: (err: any) => {
      alert(`Erro ao atualizar item: ${err.response?.data?.details || err.message}`);
    }
  });


  // States for Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);

  const [stockChange, setStockChange] = useState<number>(0);
  const [orderChange, setOrderChange] = useState<number>(0);
  const [receiveQuantity, setReceiveQuantity] = useState<number>(0);
  const [targetStock, setTargetStock] = useState<StockType>(StockType.GENERAL);

  // States for Composed Parts
  const [isComposed, setIsComposed] = useState(false);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [compSearchResults, setCompSearchResults] = useState<Part[]>([]);
  const [showCompResults, setShowCompResults] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const openModal = (part: Part, type: 'stock' | 'order' | 'receive') => {
    setSelectedPart(part);
    setModalType(type);
    setStockChange(0);
    setOrderChange(0);
    setReceiveQuantity(0);
    setTargetStock(StockType.GENERAL);
  };

  const closeModal = () => {
    setSelectedPart(null);
    setModalType(null);
    setNewItem({
      reference: '',
      designation: '',
      stock_quantity: 0,
      reserved_quantity: 0,
      ordered_quantity: 0,
      stock_quantity_foss: 0,
      reserved_quantity_foss: 0,
      ordered_quantity_foss: 0
    });
    setReservations([]);
    setIsComposed(false);
    setComponents([]);
    setCompSearch('');
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
      logger.error(err, 'Error fetching schedule details:');
      await alert('Erro ao carregar detalhes do agendamento.');
    }
  };

  const handleCloseScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleScheduleUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    handleCloseScheduleModal();
    if (selectedPart) handleViewReservations(selectedPart);
  }, [queryClient, handleCloseScheduleModal, selectedPart]);

  const handleManageReport = useCallback(async (event: ScheduleEvent) => {
    handleCloseScheduleModal();
    setSelectedEvent(event);
    try {
      const response = await apiClient.get<Report>(`/reports/by-schedule/${event.id}`);
      setReportToEdit(response.data);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number } };
        if (axiosError.response.status === 404) {
          setReportToEdit(null);
          return;
        }
      }
      logger.error(error, "Erro ao verificar relatório existente:");
      await alert("Não foi possível verificar o relatório do serviço.");
    }
    setIsReportModalOpen(true);
  }, [handleCloseScheduleModal, alert]);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setSelectedEvent(null);
    setReportToEdit(null);
  }, []);

  const handleReportSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    handleCloseReportModal();
    if (selectedPart) handleViewReservations(selectedPart);
  }, [queryClient, handleCloseReportModal, selectedPart]);

  const handleAddItem = async () => {
    if (addItemMutation.isPending) return;
    if (!newItem.reference || !newItem.designation) {
      await alert('Referência e Designação são obrigatórias.');
      return;
    }
    if (isComposed && components.length === 0) {
      await alert('Uma peça composta deve ter pelo menos um componente.');
      return;
    }

    addItemMutation.mutate({
      ...newItem,
      isComposed,
      components: components.map(c => ({ partId: c.partId, quantity: c.quantity }))
    });
  };

  const executeCompSearch = async (query: string) => {
    if (query.trim().length > 1) {
      try {
        // Search server-side for components to ensure we find everything
        const response = await apiClient.get(`/api/inventory?page=1&limit=20&search=${encodeURIComponent(query)}`);
        const results = (response.data.data || response.data || []).filter((p: Part) => !p.is_composed);
        setCompSearchResults(results);
        setShowCompResults(true);
      } catch (err) {
        logger.error(err, 'Error searching for components:');
      }
    } else {
      setShowCompResults(false);
    }
  };

  const addComponent = (part: Part) => {
    if (components.some(c => c.partId === part.id)) {
      setCompSearch('');
      setShowCompResults(false);
      return;
    }
    setComponents([...components, {
      partId: part.id as number,
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

  const handleEditItem = async (part: Part) => {
    setSelectedPart(part);
    setModalType('add_item');
    setIsComposed(!!part.is_composed);
    setNewItem({
      reference: part.reference,
      designation: part.designation,
      stock_quantity: part.stock_quantity,
      reserved_quantity: part.reserved_quantity,
      ordered_quantity: part.ordered_quantity,
      stock_quantity_foss: part.stock_quantity_foss,
      reserved_quantity_foss: part.reserved_quantity_foss,
      ordered_quantity_foss: part.ordered_quantity_foss,
      id: part.id
    });

    if (part.is_composed) {
      try {
        const response = await apiClient.get(`/api/inventory/${part.id}/components`);
        setComponents(response.data);
      } catch (err) {
        logger.error(err, 'Error fetching component details:');
      }
    } else {
      setComponents([]);
    }
  };

  const handleUpdateItem = async () => {
    if (!newItem.id || !newItem.reference || !newItem.designation || updateItemMutation.isPending) return;
    if (isComposed && components.length === 0) {
      await alert('Uma peça composta deve ter pelo menos um componente.');
      return;
    }

    updateItemMutation.mutate({
      ...newItem,
      isComposed,
      components: components.map(c => ({ partId: c.partId, quantity: c.quantity }))
    });
  };

  const handleStockChange = async () => {
    if (!selectedPart || stockChange === 0 || isSubmittingManual) return;
    setIsSubmittingManual(true);
    try {
      const response = await apiClient.put<Part>(`/api/inventory/${selectedPart.id}/stock`, {
        quantity: stockChange,
        fromOrder: false,
        targetStock: targetStock
      });

      const updatedItem = response.data;

      // Update local cache immediately
      queryClient.setQueryData(['inventory', page], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: Part) => item.id === updatedItem.id ? updatedItem : item)
        };
      });

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    } catch (err: any) {
      await alert('Erro ao ajustar o stock.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleOrderChange = async () => {
    if (!selectedPart || orderChange <= 0 || isSubmittingManual) return;
    setIsSubmittingManual(true);
    try {
      const response = await apiClient.put<Part>(`/api/inventory/${selectedPart.id}/order`, {
        quantity: orderChange,
        targetStock: targetStock
      });

      const updatedItem = response.data;

      // Update local cache immediately
      queryClient.setQueryData(['inventory', page], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: Part) => item.id === updatedItem.id ? updatedItem : item)
        };
      });

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    } catch (err: any) {
      await alert('Erro ao registar a encomenda.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleReceiveOrder = async () => {
    if (!selectedPart || receiveQuantity <= 0 || isSubmittingManual) return;
    setIsSubmittingManual(true);
    try {
      const response = await apiClient.put<Part>(`/api/inventory/${selectedPart.id}/stock`, {
        quantity: receiveQuantity,
        fromOrder: true,
        targetStock: targetStock
      });

      const updatedItem = response.data;

      // Update local cache immediately
      queryClient.setQueryData(['inventory', page], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: Part) => item.id === updatedItem.id ? updatedItem : item)
        };
      });

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    } catch (err: any) {
      await alert('Erro ao receber a encomenda.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleViewReservations = async (part: Part) => {
    setSelectedPart(part);
    setModalType('reservations');
    setLoadingReservations(true);
    try {
      const response = await apiClient.get(`/api/inventory/${part.id}/reservations`);
      setReservations(response.data);
    } catch (err) {
      logger.error(err, 'Error fetching reservations:');
      await alert('Erro ao carregar reservas.');
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleSyncReservations = async () => {
    if (!selectedPart) return;
    try {
      await apiClient.post(`/api/inventory/${selectedPart.id}/sync`);
      await alert('Stock sincronizado com sucesso!');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      alert('Erro ao sincronizar.');
    }
  };

  const handleDelete = async (part: Part) => {
    if (await confirm({
      message: `Tem a certeza que deseja apagar o item "${part.designation}" (${part.reference})?`,
      title: 'Apagar Item de Inventário',
      variant: 'danger',
      confirmText: 'Apagar'
    })) {
      try {
        await apiClient.delete(`/api/inventory/${part.id}`);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      } catch (error: any) {
        logger.error(error, "Erro ao apagar item:");
        await alert(error.response?.data?.error || "Erro ao apagar item.");
      }
    }
  };

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (view === 'low_stock') {
      items = items.filter(p => (p.available_quantity ?? 0) <= 5);
    } else if (view === 'reserved') {
      items = items.filter(p => (p.reserved_quantity || 0) > 0 || (p.reserved_quantity_foss || 0) > 0);
    }
    return items;
  }, [inventory, view]);

  if (loading && !inventory.length) {
    return (
      <div className="container-fluid mt-4">
        <div className="skeleton skeleton-title" style={{ width: '300px' }}></div>
        <div className="skeleton mb-4" style={{ height: '60px', borderRadius: '12px' }}></div>
        <div className="card border-0 shadow-sm p-0 overflow-hidden" style={{ borderRadius: '16px' }}>
          <div className="p-3 bg-light border-bottom">
            <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-bottom d-flex gap-3">
              <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '20%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '10%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '10%' }}></div>
              <div className="skeleton skeleton-text ms-auto" style={{ width: '15%' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestão de Inventário</h1>
        <button
          className={`btn ${modalType === 'add_item' ? 'btn-secondary' : 'btn-success'}`}
          onClick={() => {
            if (modalType === 'add_item') {
              closeModal();
            } else {
              closeModal();
              setModalType('add_item');
            }
          }}
          title={modalType === 'add_item' ? 'Cancelar' : 'Novo Item'}
        >
          {modalType === 'add_item' ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {modalType === 'add_item' && !newItem.id && (
        <InventoryItemForm
          newItem={newItem}
          setNewItem={setNewItem}
          isComposed={isComposed}
          setIsComposed={setIsComposed}
          components={components}
          compSearch={compSearch}
          setCompSearch={setCompSearch}
          handleCompSearch={executeCompSearch}
          compSearchResults={compSearchResults}
          showCompResults={showCompResults}
          addComponent={addComponent}
          removeComponent={removeComponent}
          updateComponentQty={updateComponentQty}
          isSubmitting={addItemMutation.isPending || updateItemMutation.isPending}
          onClose={closeModal}
          onSubmit={handleAddItem}
          isInline={true}
        />
      )}

      <InventoryToolbar
        filter={filter}
        setFilter={setFilter}
        onSearch={() => {
          setSearch(filter);
          setPage(1);
        }}
        onReset={() => {
          setFilter('');
          setSearch('');
          setPage(1);
        }}
        view={view}
        setView={setView}
      />

      {filteredInventory.length === 0 ? (
        <div className="alert alert-info">Nenhuma peça encontrada para os filtros selecionados.</div>
      ) : (
        <InventoryTable
          inventory={filteredInventory}
          onOpenModal={openModal}
          onEditItem={handleEditItem}
          onViewReservations={handleViewReservations}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination Controls */}
      {!loading && inventory.length > 0 && pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3 mb-5">
          <span className="text-muted">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} itens)
          </span>
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(pagination.page - 1)}>Anterior</button>
              </li>
              <li className="page-item active">
                <span className="page-link">{pagination.page}</span>
              </li>
              <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(pagination.page + 1)}>Próximo</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Modals */}
      {modalType === 'add_item' && newItem.id && (
        <InventoryItemForm
          newItem={newItem}
          setNewItem={setNewItem}
          isComposed={isComposed}
          setIsComposed={setIsComposed}
          components={components}
          compSearch={compSearch}
          setCompSearch={setCompSearch}
          handleCompSearch={executeCompSearch}
          compSearchResults={compSearchResults}
          showCompResults={showCompResults}
          addComponent={addComponent}
          removeComponent={removeComponent}
          updateComponentQty={updateComponentQty}
          isSubmitting={addItemMutation.isPending || updateItemMutation.isPending}
          onClose={closeModal}
          onSubmit={handleUpdateItem}
          isInline={false}
        />
      )}

      <InventoryStockModals
        modalType={modalType}
        selectedPart={selectedPart}
        targetStock={targetStock}
        setTargetStock={setTargetStock}
        stockChange={stockChange}
        setStockChange={setStockChange}
        orderChange={orderChange}
        setOrderChange={setOrderChange}
        receiveQuantity={receiveQuantity}
        setReceiveQuantity={setReceiveQuantity}
        isSubmitting={isSubmittingManual}
        onClose={closeModal}
        onStockChange={handleStockChange}
        onOrderChange={handleOrderChange}
        onReceiveOrder={handleReceiveOrder}
      />

      {modalType === 'reservations' && (
        <InventoryReservationsModal
          selectedPart={selectedPart}
          loadingReservations={loadingReservations}
          reservations={reservations}
          onClose={closeModal}
          onSync={handleSyncReservations}
          onOpenScheduleDetail={handleOpenScheduleDetail}
        />
      )}

      {modalType && (modalType !== 'add_item' || newItem.id) && <div className="modal-backdrop fade show"></div>}

      {isScheduleModalOpen && selectedEvent && (
        <ScheduleDetailModal
          isOpen={isScheduleModalOpen}
          onClose={handleCloseScheduleModal}
          event={selectedEvent}
          onScheduleUpdated={handleScheduleUpdated}
          onManageReport={handleManageReport}
        />
      )}

      {isReportModalOpen && selectedEvent && (
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

