import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { SmartInput } from '../components/SmartInput';

import { Equipment, Client } from '../types';
import { EquipmentSchema, ClientSchema } from '../schemas';
import logger from '../utils/logger';
import { Pencil, Trash2, History, Plus, X, Check, Search, Cpu } from 'lucide-react';

// Formulário de Criação (com estilo Bootstrap Card)
const EquipmentForm: React.FC<{ onEquipmentAdded: () => void }> = ({ onEquipmentAdded }) => {
  const queryClient = useQueryClient();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const { alert } = useConfirm();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await apiClient.get('/api/clients');
      const validated = (response.data || []).map((item: any) => ClientSchema.parse(item));
      return validated as Client[];
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (newEquipment: any) => apiClient.post('/api/equipments', newEquipment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setBrand('');
      setModel('');
      setSerialNumber('');
      setClientName('');
      setAdditionalInfo('');
      alert('Equipamento criado com sucesso!', 'Sucesso');
      onEquipmentAdded();
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao adicionar equipamento:");
      let errorMsg = "Erro ao adicionar equipamento.";
      if (error?.response?.data?.error) errorMsg = error.response.data.error;
      alert(errorMsg);
    },
    onSettled: () => setIsSubmitting(false)
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const selectedClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase().trim());
    if (!selectedClient) {
      await alert('Por favor, selecione um cliente válido da lista.');
      return;
    }

    setIsSubmitting(true);
    createMutation.mutate({ brand, model, serialNumber, clientId: selectedClient.id, additionalInfo });
  };

  return (
    <div className="glass-card border-0 mb-4 overflow-hidden animate__animated animate__fadeIn rounded-4">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', letterSpacing: '0.02em' }}>Novo Equipamento</h5>
      </div>
      <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2 mb-1 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Cliente (Proprietário)</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <input
                  className="form-control border-0 py-2 ps-3"
                  list="clientOptions"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Pesquisar cliente..."
                  required
                />
              </div>
              <datalist id="clientOptions">
                {clients.map(client => <option key={client.id} value={client.name} />)}
              </datalist>
            </div>
            <div className="col-md-2">
              <SmartInput
                label="Marca"
                value={brand}
                onChange={setBrand}
                required
                options={{ minLength: 2 }}
                placeholder="Ex: Bosch"
              />
            </div>
            <div className="col-md-3">
              <SmartInput
                label="Modelo"
                value={model}
                onChange={setModel}
                required
                options={{ minLength: 2 }}
                placeholder="Ex: WineScan"
              />
            </div>
            <div className="col-md-2">
              <SmartInput
                label="Nº de Série"
                value={serialNumber}
                onChange={setSerialNumber}
                required
                options={{ minLength: 3, disableHeuristics: true }}
                placeholder="SN-123"
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2 mb-1 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Notas do Equipamento</label>
              <textarea
                className="form-control shadow-sm border rounded-3"
                rows={2}
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                placeholder="Peculiaridades, histórico rápido ou detalhes técnicos..."
              />
            </div>
            <div className="col-12 d-flex justify-content-end mt-4">
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : <Check size={18} strokeWidth={2.5} />}
                Registar Equipamento
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Modal de Edição
const EditEquipmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onSave: (updatedEquipment: any) => Promise<void>;
}> = ({ isOpen, onClose, equipment, onSave }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientId, setClientId] = useState<number | string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await apiClient.get('/api/clients');
      const validated = (response.data || []).map((item: any) => ClientSchema.parse(item));
      return validated as Client[];
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (equipment) {
      setBrand(equipment.brand);
      setModel(equipment.model);
      setSerialNumber(equipment.serialNumber);
      setAdditionalInfo(equipment.additionalInfo || '');
      // We need the clientId. The GET /api/equipments returns clientName but might not return clientId directly if not requested.
      // Let's assume we might need to find the client by name or ensure the API returns clientId.
      // Checking the API implementation: it returns 'clients(name)'. It does NOT return clientId explicitly in the top level.
      // Wait, the API I replaced returns: id, brand, model, serialNumber, clientName.
      // It does NOT return clientId. I should fix the API or lookup the client.
      // Actually, looking at the code I wrote for PUT, it requires clientId.
      // So I will need to iterate the clients list to find the one matching clientName, OR update the GET api to return clientId as well.

      // FIXING ON THE FLY: I will try to find client by name for now, but ideally API should return it.
      // However, since I cannot easily change the API return shape without breaking types elsewhere potentially (though I just updated it),
      // lets try to match by name.
      // Wait, I can just update the client list fetch to happen first, then match.
    }
  }, [equipment]);

  // Effect to find clientId from name after clients are loaded
  useEffect(() => {
    if (equipment && clients.length > 0) {
      const client = clients.find(c => c.name === equipment.clientName);
      if (client) {
        setClientId(client.id);
        setClientSearch(client.name);
      }
    }
  }, [equipment, clients]);

  // Sync clientId with clientSearch when user types with Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (clientSearch && clients.length > 0) {
        const selectedClient = clients.find(c => c.name.toLowerCase() === clientSearch.toLowerCase().trim());
        if (selectedClient) {
          if (selectedClient.id !== clientId) {
            setClientId(selectedClient.id);
          }
        } else {
          if (clientId !== '') {
            setClientId('');
          }
        }
      } else if (!clientSearch && clientId !== '') {
        setClientId('');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch, clients, clientId]);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (equipment && clientId) {
      setIsSaving(true);
      try {
        await onSave({ ...equipment, brand, model, serialNumber, clientId: Number(clientId), additionalInfo });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen || !equipment) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn rounded-4" style={{ width: '90%', maxWidth: '600px' }} role="dialog" aria-modal="true">
        <form onSubmit={handleSubmit}>
          <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', letterSpacing: '0.02em' }}>
              Editar Equipamento
            </h5>
            <button type="button" className="btn-close btn-close-white opacity-75 hover-opacity-100 transition-all" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Cliente (Proprietário)</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border bg-white">
                <span className="input-group-text bg-transparent border-0 pe-0 ps-3">
                  <Search size={16} className="text-muted opacity-50" />
                </span>
                <input
                  className="form-control border-0 py-2 ps-2 shadow-none"
                  list="editClientOptions"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Pesquisar cliente..."
                  required
                />
              </div>
              <datalist id="editClientOptions">
                {clients.map(client => <option key={client.id} value={client.name} />)}
              </datalist>
              {!clientId && clientSearch.trim() !== '' && (
                <div className="form-text text-danger small mt-1 animate__animated animate__headShake">Cliente não encontrado. Selecione um cliente da lista.</div>
              )}
            </div>

            <div className="row g-3">
              <div className="col-md-6 mb-3">
                <SmartInput
                  label="Marca"
                  value={brand}
                  onChange={setBrand}
                  required
                  options={{ minLength: 2 }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <SmartInput
                  label="Modelo"
                  value={model}
                  onChange={setModel}
                  required
                  options={{ minLength: 2 }}
                />
              </div>
            </div>
            <div className="mb-3">
              <SmartInput
                label="Nº de Série"
                value={serialNumber}
                onChange={setSerialNumber}
                required
                options={{ minLength: 3, disableHeuristics: true }}
              />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Notas:</label>
              <textarea
                className="form-control shadow-sm border border-light-subtle rounded-3 bg-white"
                rows={3}
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                placeholder="Informações adicionais..."
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>
          <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium hover-bg-light transition-all" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all" disabled={isSaving || !clientId}>
              {isSaving ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : <Check size={18} strokeWidth={2.5} />}
              Guardar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Lista
const EquipmentList: React.FC<{
  equipments: Equipment[],
  onEdit: (eq: Equipment) => void,
  onDelete: (eq: Equipment) => void
}> = ({ equipments, onEdit, onDelete }) => {
  return (
    <div className="glass-card border-0 shadow-sm overflow-hidden animate__animated animate__fadeIn rounded-4">
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead className="bg-dark text-white">
            <tr className="text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
              <th className="ps-4 py-3 border-0">Proprietário</th>
              <th className="py-3 border-0">Marca / Modelo</th>
              <th className="py-3 border-0">Nº de Série</th>
              <th className="text-end pe-4 py-3 border-0">Ações</th>
            </tr>
          </thead>
          <tbody className="border-0">
            {equipments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-5">
                  <div className="py-4">
                    <Search size={48} className="text-primary opacity-25 mb-3" />
                    <p className="m-0 fw-medium text-muted h5">Nenhum equipamento encontrado.</p>
                    <small className="text-muted opacity-75">Tente ajustar os termos de pesquisa.</small>
                  </div>
                </td>
              </tr>
            ) : (
              equipments.map(equipment => (
                <tr key={equipment.id} className="hover-bg-light transition-all border-bottom border-light">
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-dark h6 m-0" style={{ fontFamily: 'var(--font-family-title)' }}>{equipment.clientName}</div>
                  </td>
                  <td className="py-3">
                    <div className="fw-semibold text-dark">{equipment.model}</div>
                    <div className="small text-muted mt-1">
                      <span className="fw-bold text-primary small">{equipment.brand}</span>
                    </div>
                  </td>
                  <td className="py-3 text-dark">
                    {equipment.serialNumber}
                  </td>
                  <td className="text-end pe-4 py-3">
                    <div className="d-flex justify-content-end gap-2">
                      <Link
                        to={`/equipments/${equipment.id}/history`}
                        className="btn btn-icon btn-outline-info rounded-circle border-2 shadow-sm transition-all"
                        title="Ver Histórico"
                      >
                        <History size={18} strokeWidth={2.5} />
                      </Link>
                      <button
                        className="btn btn-icon btn-outline-warning rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onEdit(equipment)}
                        title="Editar Equipamento"
                      >
                        <Pencil size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        className="btn btn-icon btn-outline-danger rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onDelete(equipment)}
                        title="Apagar Equipamento"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Página Principal
const EquipmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { confirm, alert } = useConfirm();

  // Queries
  const { data: equipments = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipments', searchQuery],
    queryFn: async () => {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await apiClient.get('/api/equipments', { params });
      const raw = response.data || [];
      return raw.map((item: unknown) => {
        const result = EquipmentSchema.safeParse(item);
        if (!result.success) {
          logger.error(result.error.format(), '[SCHEMA_ERROR] Equipment validation failed:');
          return item as Equipment;
        }
        return result.data as Equipment;
      }) as Equipment[];
    }
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (updatedEquipment: Equipment) => apiClient.put(`/api/equipments/${updatedEquipment.id}`, updatedEquipment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      handleCloseEditModal();
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao atualizar equipamento:");
      let errorMsg = "Erro ao atualizar equipamento.";
      if (error?.response?.data?.error) errorMsg = error.response.data.error;
      alert(errorMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (eqId: number) => apiClient.delete(`/api/equipments/${eqId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao apagar equipamento:");
      alert("Erro ao apagar equipamento. Verifique se existem registos associados.");
    }
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // --- Handlers Edit ---
  const handleOpenEditModal = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedEquipment(null);
    setIsEditModalOpen(false);
  };

  const handleSaveEdit = async (updatedEquipment: Equipment) => {
    await updateMutation.mutateAsync(updatedEquipment);
  };

  // --- Handlers Delete ---
  const handleDelete = async (eq: Equipment) => {
    if (await confirm({
      message: `Tem a certeza que deseja apagar o equipamento ${eq.brand} ${eq.model} (${eq.serialNumber})?`,
      title: 'Apagar Equipamento',
      variant: 'danger',
      confirmText: 'Apagar'
    })) {
      deleteMutation.mutate(eq.id);
    }
  };

  const [showNewEquipmentForm, setShowNewEquipmentForm] = useState(false);

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 mt-2">
        <div>
        <div className="d-flex align-items-center gap-3">
          <Cpu size={40} strokeWidth={2.5} className="text-primary" />
          <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Equipamentos</h1>
        </div>
          <p className="text-muted small m-0 fst-italic">Consulte e gira o parque de equipamentos instalados</p>
        </div>
        <button
          className={`btn ${showNewEquipmentForm ? 'btn-secondary' : 'btn-primary'} rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all`}
          onClick={() => setShowNewEquipmentForm(!showNewEquipmentForm)}
        >
          {showNewEquipmentForm ? (
            <>
              <X size={18} strokeWidth={2.5} />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus size={18} strokeWidth={2.5} />
              <span>Novo Equipamento</span>
            </>
          )}
        </button>
      </div>

      {showNewEquipmentForm && (
        <EquipmentForm onEquipmentAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['equipments'] });
          setShowNewEquipmentForm(false);
        }} />
      )}

      <div className="glass-card border-0 mb-4 overflow-hidden rounded-pill">
        <div className="p-2">
          <div className="input-group shadow-none bg-white rounded-pill ps-3">
            <span className="bg-transparent border-0 d-flex align-items-center text-muted pe-2">
              <Search size={18} className="opacity-50" />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-transparent py-2 shadow-none"
              placeholder="Pesquisar por proprietário, marca, modelo ou nº série..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.95rem' }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="alert alert-danger">
          Erro ao carregar equipamentos: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        <EquipmentList
          equipments={equipments}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
      )}

      <EditEquipmentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        equipment={selectedEquipment}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default EquipmentsPage;
