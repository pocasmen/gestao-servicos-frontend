import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { Link } from 'react-router-dom';

// Interfaces
interface Equipment {
  id: number;
  brand: string;
  model: string;
  serialNumber: string;
  clientName: string;
  clientId?: number; // Needed for editing
}
interface Client {
  id: number;
  name: string;
}

// Formulário de Criação (com estilo Bootstrap Card)
const EquipmentForm: React.FC<{ onEquipmentAdded: () => void }> = ({ onEquipmentAdded }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientId, setClientId] = useState<number | string>('');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    apiClient.get('/api/clients').then(response => setClients(response.data))
      .catch((error: any) => {
        console.error("Erro ao carregar clientes:", error);
      });
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    apiClient.post('/api/equipments', { brand, model, serialNumber, clientId: Number(clientId) })
      .then(() => {
        setBrand('');
        setModel('');
        setSerialNumber('');
        setClientId('');
        onEquipmentAdded();
      })
      .catch((error: any) => {
        console.error("Erro ao adicionar equipamento:", error);
        alert("Erro ao adicionar equipamento: " + (error.response?.data?.error || error.message));
      });
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">Novo Equipamento</div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-3 mb-2">
              <label className="form-label">Cliente (Proprietário)</label>
              <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">Selecione...</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">Marca</label>
              <input type="text" className="form-control" value={brand} onChange={e => setBrand(e.target.value)} required />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">Modelo</label>
              <input type="text" className="form-control" value={model} onChange={e => setModel(e.target.value)} required />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">Nº de Série</label>
              <input type="text" className="form-control" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} required />
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-12 text-end">
              <button type="submit" className="btn btn-success">Adicionar Equipamento</button>
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
  onSave: (updatedEquipment: any) => void;
}> = ({ isOpen, onClose, equipment, onSave }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientId, setClientId] = useState<number | string>('');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch clients specifically for the modal if needed, or rely on parent passing them? 
      // For simplicity, let's fetch here or we could lift state up. 
      // Since the form also fetches, maybe better to fetch once in parent. 
      // But to keep logic isolated similar to EquipmentForm, fetching here.
      apiClient.get('/api/clients').then(response => setClients(response.data));
    }
  }, [isOpen]);

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


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (equipment && clientId) {
      onSave({ ...equipment, brand, model, serialNumber, clientId: Number(clientId) });
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
                <label className="form-label">Marca</label>
                <input type="text" className="form-control" value={brand} onChange={e => setBrand(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Modelo</label>
                <input type="text" className="form-control" value={model} onChange={e => setModel(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Nº de Série</label>
                <input type="text" className="form-control" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} required />
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
                        Histórico
                      </Link>
                      <button className="btn btn-sm btn-outline-warning me-2" onClick={() => onEdit(equipment)} title="Editar">
                        Editar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(equipment)} title="Apagar">
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

// Página Principal
const EquipmentsPage: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const fetchEquipments = (query: string = '') => {
    const params = query ? { search: query } : {};
    apiClient.get('/api/equipments', { params }).then(response => {
      setEquipments(response.data);
    })
      .catch((error: any) => {
        console.error("Erro ao carregar equipamentos:", error);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEquipments(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- Handlers Edit ---
  const handleOpenEditModal = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedEquipment(null);
    setIsEditModalOpen(false);
  };

  const handleSaveEdit = (updatedEquipment: any) => {
    apiClient.put(`/api/equipments/${updatedEquipment.id}`, updatedEquipment)
      .then(() => {
        fetchEquipments(searchQuery);
        handleCloseEditModal();
      })
      .catch((error: any) => {
        console.error("Erro ao atualizar equipamento:", error);
        alert("Erro ao atualizar equipamento.");
      });
  };

  // --- Handlers Delete ---
  const handleDelete = (eq: Equipment) => {
    if (window.confirm(`Tem a certeza que deseja apagar o equipamento ${eq.brand} ${eq.model} (${eq.serialNumber})?`)) {
      apiClient.delete(`/api/equipments/${eq.id}`)
        .then(() => {
          fetchEquipments(searchQuery);
        })
        .catch((error: any) => {
          console.error("Erro ao apagar equipamento:", error);
          alert("Erro ao apagar equipamento. Verifique se existem registos associados.");
        });
    }
  };


  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Gestão de Equipamentos</h1>
      </div>

      <EquipmentForm onEquipmentAdded={() => fetchEquipments(searchQuery)} />

      <div className="mb-4">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="🔍 Pesquisar por marca, modelo ou nº série..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <EquipmentList
        equipments={equipments}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
      />

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
