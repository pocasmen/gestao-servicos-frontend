import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { SmartInput } from '../components/SmartInput';
import { UserRole } from '../constants/enums';

import { Client } from '../types';
import { ClientSchema } from '../schemas';
import logger from '../utils/logger';
import { Pencil, Trash2, UserPlus, Plus, X, Check, Send } from 'lucide-react';

// Componente do Formulário (Criação)

const ClientForm: React.FC<{ onClientAdded: () => void }> = ({ onClientAdded }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [nif, setNif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alert } = useConfirm();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    apiClient.post('/api/clients', { name, address, city, postCode, nif })
      .then(async () => {
        // Limpa o formulário e notifica o componente pai
        setName('');
        setAddress('');
        setCity('');
        setPostCode('');
        setNif('');
        await alert('Cliente criado com sucesso!', 'Sucesso');
        onClientAdded();
      })
      .catch(async (error: unknown) => {
        logger.error(error, "Erro ao criar cliente:");
        let errorMsg = "Erro ao criar cliente.";
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response: { data: { error: string } } };
          errorMsg = axiosError.response?.data?.error || errorMsg;
        }
        await alert(errorMsg);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="card mb-4">
      {/* ... rest of jsx ... */}
      <div className="card-header bg-primary text-white">Novo Cliente</div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-10 mb-2">
              <SmartInput
                label="Nome"
                value={name}
                onChange={setName}
                required
                options={{ minLength: 3, blockScripts: true }}
                placeholder="Nome do Cliente ou Empresa"
              />
            </div>
            <div className="col-md-2 mb-2">
              <SmartInput
                label="NIF"
                value={nif}
                onChange={setNif}
                options={{ type: 'numeric', minLength: 9, maxLength: 9, disableHeuristics: true }}
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-7 mb-2">
              <SmartInput
                label="Morada"
                value={address}
                onChange={setAddress}
                options={{ blockScripts: true }}
                placeholder="Rua, Número, Andar..."
              />
            </div>
            <div className="col-md-2 mb-2">
              <SmartInput
                label="Cód. Postal"
                value={postCode}
                onChange={setPostCode}
                options={{ maxLength: 8 }}
                placeholder="4000-000"
              />
            </div>
            <div className="col-md-3 mb-2">
              <SmartInput
                label="Localidade"
                value={city}
                onChange={setCity}
                options={{ blockScripts: true }}
                placeholder="Cidade"
              />
            </div>
            <div className="col-md-12 mb-2 d-flex justify-content-end">
              <button type="submit" className="btn btn-success" disabled={isSubmitting} title="Criar Cliente">
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

// ... (ClientList and EditClientModal remain unchanged but let's be safe and not touch them if possible, but I must replace ClientForm inside the file)
// Wait, replace_file_content replaces a block.
// I will target ClientForm first.

// And then ClientsPage component.

// Let's split this into smaller chunks to avoid large replacements and potential errors if I miss lines.



// Componente da Lista
const ClientList: React.FC<{
  clients: Client[],
  onInvite: (client: Client) => void,
  onEdit: (client: Client) => void,
  onDelete: (client: Client) => void
}> = ({ clients, onInvite, onEdit, onDelete }) => {
  return (
    <div className="card">
      <div className="card-header">Lista de Clientes</div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Morada</th>
                <th>NIF</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">Nenhum cliente encontrado.</td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>
                      <div>{client.address}</div>
                      <small className="text-muted">{client.postCode} {client.city}</small>
                    </td>
                    <td>{client.nif}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => onInvite(client)} title="Convidar Utilizador">
                        <UserPlus size={18} />
                      </button>
                      <button className="btn btn-sm btn-outline-warning me-2" onClick={() => onEdit(client)} title="Editar Cliente">
                        <Pencil size={18} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(client)} title="Apagar Cliente">
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

// Componente Modal de Edição
const EditClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (updatedClient: Client) => Promise<void>;
}> = ({ isOpen, onClose, client, onSave }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [nif, setNif] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setAddress(client.address || '');
      setCity(client.city || '');
      setPostCode(client.postCode || '');
      setNif(client.nif || '');
    }
  }, [client]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (client) {
      setIsSaving(true);
      try {
        await onSave({ ...client, name, address, city, postCode, nif });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Editar Cliente</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <SmartInput
                  label="Nome"
                  value={name}
                  onChange={setName}
                  required
                  options={{ minLength: 3, blockScripts: true }}
                />
              </div>
              <div className="mb-3">
                <SmartInput
                  label="Morada"
                  value={address}
                  onChange={setAddress}
                  options={{ blockScripts: true }}
                />
              </div>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <SmartInput
                    label="Localidade"
                    value={city}
                    onChange={setCity}
                    options={{ blockScripts: true }}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <SmartInput
                    label="Cód. Postal"
                    value={postCode}
                    onChange={setPostCode}
                    options={{ maxLength: 8 }}
                  />
                </div>
              </div>
              <div className="mb-3">
                <SmartInput
                  label="NIF"
                  value={nif}
                  onChange={setNif}
                  options={{ type: 'numeric', minLength: 9, maxLength: 9, disableHeuristics: true }}
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

// Componente da Página Principal
const ClientsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { confirm, alert } = useConfirm();

  // Queries
  const { data: clients = [], isLoading, isError, error } = useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: async () => {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await apiClient.get('/api/clients', { params });
      const raw = response.data || [];
      return raw.map((item: unknown) => {
        const result = ClientSchema.safeParse(item);
        if (!result.success) {
          logger.error(result.error.format(), '[SCHEMA_ERROR] Client validation failed:');
          return item as Client;
        }
        return result.data as Client;
      }) as Client[];
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newClient: any) => apiClient.post('/api/clients', newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowNewClientForm(false);
      alert('Cliente criado com sucesso!', 'Sucesso');
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao criar cliente:");
      let errorMsg = "Erro ao criar cliente.";
      if (error?.response?.data?.error) errorMsg = error.response.data.error;
      alert(errorMsg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (updatedClient: Client) => apiClient.put(`/api/clients/${updatedClient.id}`, updatedClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      handleCloseEditModal();
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao atualizar cliente:");
      let errorMsg = "Erro ao atualizar cliente.";
      if (error?.response?.data?.error) errorMsg = error.response.data.error;
      alert(errorMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (clientId: number) => apiClient.delete(`/api/clients/${clientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: any) => {
      logger.error(error, "Erro ao apagar cliente:");
      alert("Erro ao apagar cliente. Verifique se existem registos associados.");
    }
  });

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedClientForInvite, setSelectedClientForInvite] = useState<Client | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);

  // --- Handlers Invite ---
  const handleOpenInviteModal = (client: Client) => {
    setSelectedClientForInvite(client);
    setIsInviteModalOpen(true);
  };

  const handleCloseInviteModal = () => {
    setSelectedClientForInvite(null);
    setIsInviteModalOpen(false);
    setInviteEmail('');
  };

  const handleSendInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClientForInvite || !inviteEmail || isInviting) return;

    setIsInviting(true);
    apiClient.post('/admin/invite-user', {
      client_id: selectedClientForInvite.id,
      email: inviteEmail,
      role: UserRole.CLIENT
    })
      .then(async () => {
        await alert(`Convite enviado com sucesso para ${inviteEmail}!`, 'Sucesso');
        handleCloseInviteModal();
      })
      .catch(async (error: unknown) => {
        let errorMessage = "Erro ao enviar convite.";
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response: { data: { error: string } } };
          errorMessage = axiosError.response?.data?.error || errorMessage;
        }
        await alert(errorMessage);
      })
      .finally(() => {
        setIsInviting(false);
      });
  };

  // --- Handlers Edit ---
  const handleOpenEditModal = (client: Client) => {
    setSelectedClientForEdit(client);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedClientForEdit(null);
    setIsEditModalOpen(false);
  };

  const handleSaveEdit = async (updatedClient: Client) => {
    await updateMutation.mutateAsync(updatedClient);
  };

  // --- Handlers Delete ---
  const handleDelete = async (client: Client) => {
    if (await confirm({
      message: `Tem a certeza que deseja apagar o cliente "${client.name}"?`,
      title: 'Apagar Cliente',
      variant: 'danger',
      confirmText: 'Apagar'
    })) {
      deleteMutation.mutate(client.id);
    }
  };

  const [showNewClientForm, setShowNewClientForm] = useState(false);

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestão de Clientes</h1>
        <button
          className={`btn ${showNewClientForm ? 'btn-secondary' : 'btn-success'}`}
          onClick={() => setShowNewClientForm(!showNewClientForm)}
          title={showNewClientForm ? 'Cancelar' : 'Novo Cliente'}
        >
          {showNewClientForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {showNewClientForm && (
        <ClientForm onClientAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          setShowNewClientForm(false);
        }} />
      )}

      <div className="mb-4">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="🔍 Pesquisar clientes..."
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
          Erro ao carregar clientes: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        <ClientList
          clients={clients}
          onInvite={handleOpenInviteModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && selectedClientForInvite && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSendInvite}>
                <div className="modal-header">
                  <h5 className="modal-title">Convidar Utilizador para {selectedClientForInvite.name}</h5>
                  <button type="button" className="btn-close" onClick={handleCloseInviteModal}></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Email do Utilizador</label>
                    <input
                      type="email"
                      className="form-control"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseInviteModal} disabled={isInviting} title="Cancelar">
                    <X size={20} />
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isInviting} title="Enviar Convite">
                    {isInviting ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : <Send size={20} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        client={selectedClientForEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default ClientsPage;
