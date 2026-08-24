import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { SmartInput } from '../components/SmartInput';
import { UserRole } from '../constants/enums';
import { AuthContext } from '../contexts/AuthContext';

import { Client } from '../types';
import { ClientSchema } from '../schemas';
import LoadingState from '../components/LoadingState';
import { EditClientModal } from '../components/EditClientModal';
import logger from '../utils/logger';
import { Pencil, Trash2, UserPlus, Plus, X, Check, Send, Search, Users, ShieldAlert, AlertTriangle, Eye } from 'lucide-react';

// Componente do Formulário (Criação)

const ClientForm: React.FC<{ onClientAdded: () => void }> = ({ onClientAdded }) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
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
    apiClient.post('/api/clients', { name, nickname, address, city, postCode, nif })
      .then(async () => {
        // Limpa o formulário e notifica o componente pai
        setName('');
        setNickname('');
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
    <div className="glass-card border-0 mb-4 overflow-hidden animate__animated animate__fadeIn rounded-4">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', letterSpacing: '0.02em' }}>Novo Cliente</h5>
      </div>
      <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <SmartInput
                label="Nome do Registo (Oficial)"
                value={name}
                onChange={setName}
                required
                options={{ minLength: 3, blockScripts: true }}
                placeholder="Ex: Nome da Empresa Lda"
              />
            </div>
            <div className="col-md-3">
              <SmartInput
                label="Alcunha / Nome Curto"
                value={nickname}
                onChange={setNickname}
                options={{ blockScripts: true }}
                placeholder="Como é conhecida"
              />
            </div>
            <div className="col-md-3">
              <SmartInput
                label="NIF"
                value={nif}
                onChange={setNif}
                options={{ type: 'numeric', minLength: 9, maxLength: 9, disableHeuristics: true }}
                placeholder="123456789"
              />
            </div>
            <div className="col-md-6">
              <SmartInput
                label="Morada"
                value={address}
                onChange={setAddress}
                options={{ blockScripts: true }}
                placeholder="Rua, Número, Andar..."
              />
            </div>
            <div className="col-md-3">
              <SmartInput
                label="Cód. Postal"
                value={postCode}
                onChange={setPostCode}
                options={{ maxLength: 8 }}
                placeholder="4000-000"
              />
            </div>
            <div className="col-md-3">
              <SmartInput
                label="Localidade"
                value={city}
                onChange={setCity}
                options={{ blockScripts: true }}
                placeholder="Cidade"
              />
            </div>
            <div className="col-md-12 d-flex justify-content-end mt-4">
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : <Check size={18} strokeWidth={2.5} />}
                Criar Cliente
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



const ClientList: React.FC<{
  clients: Client[],
  onView: (client: Client) => void,
  onInvite: (client: Client) => void,
  onEdit: (client: Client) => void,
  onDelete: (client: Client) => void
}> = ({ clients, onView, onInvite, onEdit, onDelete }) => {
  return (
    <div className="glass-card border-0 shadow-sm overflow-hidden animate__animated animate__fadeIn rounded-4">
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead className="bg-dark text-white">
            <tr className="text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
              <th className="ps-4 py-3 border-0">Cliente / Alcunha</th>
              <th className="py-3 border-0">Morada / Detalhes</th>
              <th className="py-3 border-0">NIF / Identificação</th>
              <th className="text-end pe-4 py-3 border-0">Ações</th>
            </tr>
          </thead>
          <tbody className="border-0">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-5">
                  <div className="py-4">
                    <Search size={48} className="text-primary opacity-25 mb-3" />
                    <p className="m-0 fw-medium text-muted h5">Nenhum cliente encontrado.</p>
                    <small className="text-muted opacity-75">Tente ajustar os termos de pesquisa.</small>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map(client => (
                <tr key={client.id} className="hover-bg-light transition-all border-bottom border-light">
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="fw-bold text-dark h6 mb-0" style={{ fontFamily: 'var(--font-family-title)' }}>{client.name}</div>
                      {client.is_blacklisted && (
                        <span className="badge rounded-pill bg-danger d-flex align-items-center gap-1 py-1 px-2 animate__animated animate__pulse animate__infinite" title={`Black List: ${client.blacklist_reason || 'Sem razão especificada'}`}>
                          <ShieldAlert size={12} />
                          <span style={{ fontSize: '0.65rem' }}>DÉBITO</span>
                        </span>
                      )}
                    </div>
                    {client.nickname && (
                      <small className="text-muted">{client.nickname}</small>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="fw-medium text-dark">{client.address}</div>
                    <small className="text-muted d-flex align-items-center gap-1">
                      {client.postCode} {client.city}
                    </small>
                  </td>
                  <td className="py-3">
                    <small className="text-muted">{client.nif}</small>
                  </td>
                  <td className="text-end pe-4 py-3">
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-icon btn-outline-info rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onView(client)}
                        title="Ver Detalhes"
                      >
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        className="btn btn-icon btn-outline-primary rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onInvite(client)}
                        title="Convidar Utilizador"
                      >
                        <UserPlus size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        className="btn btn-icon btn-outline-warning rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onEdit(client)}
                        title="Editar Cliente"
                      >
                        <Pencil size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        className="btn btn-icon btn-outline-danger rounded-circle border-2 shadow-sm transition-all"
                        onClick={() => onDelete(client)}
                        title="Apagar Cliente"
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

// Componente da Página Principal
const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, alert } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterBlacklisted, setFilterBlacklisted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['settings', 'equipment-categories'],
    queryFn: async () => {
        const res = await apiClient.get('/api/settings');
        const catJson = res.data.equipment_categories;
        if (catJson) {
            try {
                return JSON.parse(catJson) as string[];
            } catch (e) {
                return [];
            }
        }
        return [];
    }
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Queries
  const { data: clients = [], isLoading, isError, error } = useQuery({
    queryKey: ['clients', debouncedSearchQuery, filterBlacklisted, selectedCategory],
    queryFn: async () => {
      const params: any = debouncedSearchQuery ? { search: debouncedSearchQuery } : {};
      if (filterBlacklisted) params.is_blacklisted = true;
      if (selectedCategory) params.equipment_category = selectedCategory;
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
    apiClient.post('/api/auth/admin/invite-user', {
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 mt-2">
        <div>
          <div className="d-flex align-items-center gap-3">
            <Users size={40} strokeWidth={2.5} className="text-primary" />
            <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Clientes</h1>
          </div>
          <p className="text-muted small m-0 fst-italic">Registe e gira a sua base de dados de clientes</p>
        </div>
        <button
          className={`btn ${showNewClientForm ? 'btn-secondary' : 'btn-primary'} rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all`}
          onClick={() => setShowNewClientForm(!showNewClientForm)}
        >
          {showNewClientForm ? (
            <>
              <X size={18} strokeWidth={2.5} />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus size={18} strokeWidth={2.5} />
              <span>Novo Cliente</span>
            </>
          )}
        </button>
      </div>

      {showNewClientForm && (
        <ClientForm onClientAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          setShowNewClientForm(false);
        }} />
      )}

      <div className="d-flex flex-column flex-md-row gap-3 mb-4">
        <div className="flex-grow-1 glass-card border-0 overflow-hidden rounded-pill p-1">
          <div className="input-group shadow-none bg-white rounded-pill ps-3">
            <span className="bg-transparent border-0 d-flex align-items-center text-muted pe-2">
              <Search size={18} className="opacity-50" />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-transparent py-2 shadow-none"
              placeholder="Pesquisar por nome, alcunha, NIF ou morada..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.95rem' }}
            />
          </div>
        </div>

        <div className="glass-card border-0 overflow-hidden rounded-pill p-1" style={{ minWidth: '220px' }}>
          <select 
            className="form-select border-0 bg-transparent py-2 shadow-none fw-bold text-primary"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ fontSize: '0.95rem', cursor: 'pointer' }}
          >
            <option value="">Categorias: Todas</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button
          className={`btn ${filterBlacklisted ? 'btn-danger' : 'btn-outline-secondary'} rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all border-2`}
          onClick={() => setFilterBlacklisted(!filterBlacklisted)}
        >
          <ShieldAlert size={18} />
          {filterBlacklisted ? 'Ver Todos' : 'Apenas Black List'}
        </button>
      </div>

      {filterBlacklisted && (
        <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4 animate__animated animate__pulse d-flex align-items-center gap-3">
          <AlertTriangle className="flex-shrink-0" size={24} />
          <div>
            <h6 className="alert-heading fw-bold m-0">Filtro Ativo: Clientes Devedores</h6>
            <p className="m-0 small">Está a visualizar apenas os clientes marcados na "Black List".</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="A carregar lista de clientes..." />
      ) : isError ? (
        <div className="alert alert-danger">
          Erro ao carregar clientes: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        <ClientList
          clients={clients}
          onView={(client) => navigate(`/clients/${client.id}`)}
          onInvite={handleOpenInviteModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && selectedClientForInvite && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn rounded-4" style={{ width: '90%', maxWidth: '500px' }} role="dialog" aria-modal="true">
            <form onSubmit={handleSendInvite}>
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', fontSize: '1rem', letterSpacing: '0.02em' }}>
                  Convidar para {selectedClientForInvite.name}
                </h5>
                <button type="button" className="btn-close btn-close-white opacity-75 hover-opacity-100 transition-all" onClick={handleCloseInviteModal}></button>
              </div>
              <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Email do Utilizador</label>
                  <div className="input-group shadow-sm rounded-3 overflow-hidden border bg-white">
                    <span className="input-group-text bg-transparent border-0 pe-0 ps-3 text-muted">
                      <Send size={16} className="opacity-50" />
                    </span>
                    <input
                      type="email"
                      className="form-control border-0 ps-2 py-2 shadow-none"
                      placeholder="exemplo@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium hover-bg-light transition-all" onClick={handleCloseInviteModal} disabled={isInviting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all" disabled={isInviting}>
                  {isInviting ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : <Send size={18} strokeWidth={2.5} />}
                  Enviar Convite
                </button>
              </div>
            </form>
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
