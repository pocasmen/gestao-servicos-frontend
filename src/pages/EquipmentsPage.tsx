import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { SmartInput } from '../components/SmartInput';

import { Equipment, Client } from '../types';
import { EquipmentSchema, ClientSchema } from '../schemas';
import logger from '../utils/logger';
import { Pencil, Trash2, History, Plus, X, Check } from 'lucide-react';

// Formulário de Criação (com estilo Bootstrap Card)
const EquipmentForm: React.FC<{ onEquipmentAdded: () => void }> = ({ onEquipmentAdded }) => {
  const queryClient = useQueryClient();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientName, setClientName] = useState('');
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
    createMutation.mutate({ brand, model, serialNumber, clientId: selectedClient.id });
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">Novo Equipamento</div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-wrap">
            <div className="pe-2" style={{ flex: '1', minWidth: '200px' }}>
              <div className="d-flex flex-column" style={{ marginBottom: '1rem' }}>
                <label className="form-label mb-2" style={{ fontWeight: 500, color: '#374151' }}>Cliente (Proprietário)</label>
                <input
                  className="form-control"
                  style={{ padding: '0.5rem 0.75rem' }}
                  list="clientOptions"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Pesquisar cliente..."
                  required
                />
                <datalist id="clientOptions">
                  {clients.map(client => <option key={client.id} value={client.name} />)}
                </datalist>
              </div>
            </div>
            <div className="pe-2" style={{ width: '175px' }}>
              <SmartInput
                label="Marca"
                value={brand}
                onChange={setBrand}
                required
                options={{ minLength: 2 }}
                placeholder="Ex: Bosch"
              />
            </div>
            <div className="pe-2" style={{ width: '210px' }}>
              <SmartInput
                label="Modelo"
                value={model}
                onChange={setModel}
                required
                options={{ minLength: 2 }}
                placeholder="Ex: WineScan"
              />
            </div>
            <div style={{ width: '140px' }}>
              <SmartInput
                label="Nº de Série"
                value={serialNumber}
                onChange={setSerialNumber}
                required
                options={{ minLength: 3, disableHeuristics: true }}
                placeholder="SN-123"
              />
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-12 text-end">
              <button type="submit" className="btn btn-success" disabled={isSubmitting} title="Adicionar Equipamento">
                {isSubmitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : <Check size={20} />}
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
      }
    }
  }, [equipment, clients]);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (equipment && clientId) {
      setIsSaving(true);
      try {
        await onSave({ ...equipment, brand, model, serialNumber, clientId: Number(clientId) });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen || !equipment) return null;

  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Editar Equipamento</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Cliente (Proprietário)</label>
                <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <SmartInput
                  label="Marca"
                  value={brand}
                  onChange={setBrand}
                  required
                  options={{ minLength: 2 }}
                />
              </div>
              <div className="mb-3">
                <SmartInput
                  label="Modelo"
                  value={model}
                  onChange={setModel}
                  required
                  options={{ minLength: 2 }}
                />
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
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving} title="Cancelar">
                <X size={20} />
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving} title="Guardar Alterações">
                {isSaving ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : <Check size={20} />}
              </button>
            </div>
          </form>
        </div>
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
    <div className="card">
      <div className="card-header">Equipamentos Registados</div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Proprietário</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Nº de Série</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">Nenhum equipamento encontrado.</td>
                </tr>
              ) : (
                equipments.map(equipment => (
                  <tr key={equipment.id}>
                    <td>{equipment.clientName}</td>
                    <td>{equipment.brand}</td>
                    <td>{equipment.model}</td>
                    <td>{equipment.serialNumber}</td>
                    <td className="text-end">
                      <Link to={`/equipments/${equipment.id}/history`} className="btn btn-sm btn-outline-info me-2" title="Ver Histórico">
                        <History size={18} />
                      </Link>
                      <button className="btn btn-sm btn-outline-warning me-2" onClick={() => onEdit(equipment)} title="Editar Equipamento">
                        <Pencil size={18} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(equipment)} title="Apagar Equipamento">
                        <Trash2 size={18} />
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestão de Equipamentos</h1>
        <button
          className={`btn ${showNewEquipmentForm ? 'btn-secondary' : 'btn-success'}`}
          onClick={() => setShowNewEquipmentForm(!showNewEquipmentForm)}
          title={showNewEquipmentForm ? 'Cancelar' : 'Novo Equipamento'}
        >
          {showNewEquipmentForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {showNewEquipmentForm && (
        <EquipmentForm onEquipmentAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['equipments'] });
          setShowNewEquipmentForm(false);
        }} />
      )}

      <div className="mb-4">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="🔍 Pesquisar por proprietário, marca, modelo ou nº série..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
