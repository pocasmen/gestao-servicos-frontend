import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

// Interface para Cliente
interface Client {
  id: number;
  name: string;
  address: string;
  nif: string;
}

// Componente do Formulário (agora interno)
const ClientForm: React.FC<{ onClientAdded: () => void }> = ({ onClientAdded }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    apiClient.post('/api/clients', { name, address, nif })
      .then(() => {
        // Limpa o formulário e notifica o componente pai
        setName('');
        setAddress('');
        setNif('');
        onClientAdded();
      })
      .catch((error: any) => {
        console.error("Erro ao criar cliente:", error);
        // const errorMessage = error.response?.data?.error || "Erro ao criar cliente.";
        // alert(errorMessage);
      });
  };

  return (
    <div className="mb-4">
      <h2>Novo Cliente</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome</label>
          <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Morada</label>
          <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="form-group">
          <label>NIF</label>
          <input type="text" className="form-control" value={nif} onChange={e => setNif(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary mt-2">Criar</button>
      </form>
    </div>
  );
};

// Componente da Lista (agora interno)
const ClientList: React.FC<{ clients: Client[], onInvite: (client: Client) => void }> = ({ clients, onInvite }) => {
  return (
    <div>
      <h2>Lista de Clientes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Morada</th>
            <th>NIF</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.address}</td>
              <td>{client.nif}</td>
              <td>
                <button className="btn btn-sm btn-outline-primary" onClick={() => onInvite(client)}>
                  Convidar Utilizador
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente da Página Principal
const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
    const handleOpenInviteModal = (client: Client) => {
      setSelectedClient(client);
      setIsInviteModalOpen(true);
    };
  
    const handleCloseInviteModal = () => {
      setSelectedClient(null);
      setIsInviteModalOpen(false);
      setInviteEmail('');
    };
  
    const handleSendInvite = (event: React.FormEvent) => {
      event.preventDefault();
      if (!selectedClient || !inviteEmail) return;
  
      apiClient.post('/admin/invite-user', {
        client_id: selectedClient.id,
        email: inviteEmail,
        role: 'client' // Explicitly set role for client invites
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
  
    const fetchClients = () => {
      apiClient.get('/api/clients').then(response => {
        setClients(response.data);
      })
      .catch((error: any) => {
        console.error("Erro ao carregar clientes:", error);
      });
    };
  
    useEffect(() => {
      fetchClients();
    }, []);
  
    return (
      <div className="container mt-4">
        <ClientForm onClientAdded={fetchClients} />
        <ClientList clients={clients} onInvite={handleOpenInviteModal} />
  
        {isInviteModalOpen && selectedClient && (
          <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={handleSendInvite}>
                  <div className="modal-header">
                    <h5 className="modal-title">Convidar Utilizador para {selectedClient.name}</h5>
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
      </div>
    );
  };

export default ClientsPage;
