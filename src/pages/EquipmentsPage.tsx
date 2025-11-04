import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

// Interfaces
interface Equipment { id: number; brand: string; model: string; serialNumber: string; clientName: string; }
interface Client { id: number; name: string; }

// Formulário
const EquipmentForm: React.FC<{ onEquipmentAdded: () => void }> = ({ onEquipmentAdded }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientId, setClientId] = useState<number | string>('');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    apiClient.get('/clients').then(response => setClients(response.data));
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    apiClient.post('/equipments', { brand, model, serialNumber, clientId })
      .then(() => {
        setBrand('');
        setModel('');
        setSerialNumber('');
        setClientId('');
        onEquipmentAdded();
      });
  };

  return (
    <div className="mb-4">
      <h2>Adicionar Novo Equipamento</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Cliente (Proprietário)</label>
          <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">Selecione um cliente...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Marca</label>
          <input type="text" className="form-control" value={brand} onChange={e => setBrand(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Modelo</label>
          <input type="text" className="form-control" value={model} onChange={e => setModel(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Número de Série</label>
          <input type="text" className="form-control" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary mt-2">Adicionar Equipamento</button>
      </form>
    </div>
  );
};

// Lista
const EquipmentList: React.FC<{ equipments: Equipment[] }> = ({ equipments }) => {
  return (
    <div>
      <h2>Equipamentos Registados</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Proprietário</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Nº de Série</th>
          </tr>
        </thead>
        <tbody>
          {equipments.map(equipment => (
            <tr key={equipment.id}>
              <td>{equipment.clientName}</td>
              <td>{equipment.brand}</td>
              <td>{equipment.model}</td>
              <td>{equipment.serialNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Página Principal
const EquipmentsPage: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const fetchEquipments = () => {
    apiClient.get('/equipments').then(response => {
      setEquipments(response.data);
    });
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  return (
    <div className="container mt-4">
      <EquipmentForm onEquipmentAdded={fetchEquipments} />
      <EquipmentList equipments={equipments} />
    </div>
  );
};

export default EquipmentsPage;