import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

// Interface para Cliente
interface Client {
  id: number;
  name: string;
  address: string;
  city: string;
  postCode: string;
  nif: string;
}

// Componente do Formulário (Criação)
const ClientForm: React.FC<{ onClientAdded: () => void }> = ({ onClientAdded }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [nif, setNif] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    apiClient.post('/api/clients', { name, address, city, postCode, nif })
      .then(() => {
        // Limpa o formulário e notifica o componente pai
        setName('');
        setAddress('');
        setCity('');
        setPostCode('');
        setNif('');
        alert('Cliente criado com sucesso!');
        onClientAdded();
      })
      .catch((error: any) => {
        console.error("Erro ao criar cliente:", error);
        alert("Erro ao criar cliente.");
      });
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">Novo Cliente</div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-10 mb-2">
              <label className="form-label">Nome</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="col-md-2 mb-2">
              <label className="form-label">NIF</label>
              <input type="text" className="form-control" value={nif} onChange={e => setNif(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="col-md-7 mb-2">
              <label className="form-label">Morada</label>
              <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="col-md-2 mb-2">
              <label className="form-label">Cód. Postal</label>
              <input type="text" className="form-control" value={postCode} onChange={e => setPostCode(e.target.value)} />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">Localidade</label>
              <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="col-md-12 mb-2 d-flex justify-content-end">
              <button type="submit" className="btn btn-success">Criar Cliente</button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

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
                        <i className="bi bi-person-plus-fill"></i> Convidar
                      </button>
                      <button className="btn btn-sm btn-outline-warning me-2" onClick={() => onEdit(client)} title="Editar Cliente">
                        Editar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(client)} title="Apagar Cliente">
                        Apagar
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
  onSave: (updatedClient: Client) => void;
}> = ({ isOpen, onClose, client, onSave }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [nif, setNif] = useState('');

  useEffect(() => {
    if (client) {
      setName(client.name);
      setAddress(client.address || '');
      setCity(client.city || '');
      setPostCode(client.postCode || '');
      setNif(client.nif || '');
    }
  }, [client]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (client) {
      onSave({ ...client, name, address, city, postCode, nif });
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
                <label className="form-label">Nome</label>
                <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Morada</label>
                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label">Localidade</label>
                  <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Cód. Postal</label>
                  <input type="text" className="form-control" value={postCode} onChange={e => setPostCode(e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">NIF</label>
                <input type="text" className="form-control" value={nif} onChange={e => setNif(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Componente da Página Principal
const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedClientForInvite, setSelectedClientForInvite] = useState<Client | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);

  const fetchClients = (query: string = '') => {
    const params = query ? { search: query } : {};
    apiClient.get('/api/clients', { params }).then(response => {
      setClients(response.data);
    })
      .catch((error: any) => {
        console.error("Erro ao carregar clientes:", error);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClients(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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
    if (!selectedClientForInvite || !inviteEmail) return;

    apiClient.post('/admin/invite-user', {
      client_id: selectedClientForInvite.id,
      email: inviteEmail,
      role: 'client'
    })
      .then(() => {
        alert(`Convite enviado com sucesso para ${inviteEmail}!`);
        handleCloseInviteModal();
      })
      .catch((error: any) => {
        const errorMessage = error.response?.data?.error || "Erro ao enviar convite.";
        alert(errorMessage);
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

  const handleSaveEdit = (updatedClient: Client) => {
    apiClient.put(`/api/clients/${updatedClient.id}`, updatedClient)
      .then(() => {
        // Atualizar lista localmente ou refetch
        fetchClients(searchQuery);
        handleCloseEditModal();
      })
      .catch((error: any) => {
        console.error("Erro ao atualizar cliente:", error);
        alert("Erro ao atualizar cliente.");
      });
  };

  // --- Handlers Delete ---
  const handleDelete = (client: Client) => {
    if (window.confirm(`Tem a certeza que deseja apagar o cliente "${client.name}"?`)) {
      apiClient.delete(`/api/clients/${client.id}`)
        .then(() => {
          fetchClients(searchQuery);
        })
        .catch((error: any) => {
          console.error("Erro ao apagar cliente:", error);
          alert("Erro ao apagar cliente. Verifique se existem registos associados.");
        });
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Gestão de Clientes</h1>
      </div>

      <ClientForm onClientAdded={() => fetchClients(searchQuery)} />

      <div className="mb-4">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="🔍 Pesquisar clientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ClientList
        clients={clients}
        onInvite={handleOpenInviteModal}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
      />

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
                  <button type="button" className="btn btn-secondary" onClick={handleCloseInviteModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Enviar Convite</button>
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
