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
    apiClient.post('/clients', { name, address, nif })
      .then(() => {
        // Limpa o formulário e notifica o componente pai
        setName('');
        setAddress('');
        setNif('');
        onClientAdded();
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
const ClientList: React.FC<{ clients: Client[] }> = ({ clients }) => {
  return (
    <div>
      <h2>Lista de Clientes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Morada</th>
            <th>NIF</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.address}</td>
              <td>{client.nif}</td>
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

  const fetchClients = () => {
    apiClient.get('/clients').then(response => {
      setClients(response.data);
    });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="container mt-4">
      <ClientForm onClientAdded={fetchClients} />
      <ClientList clients={clients} />
    </div>
  );
};

export default ClientsPage;
