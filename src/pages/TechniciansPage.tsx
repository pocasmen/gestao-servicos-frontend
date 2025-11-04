import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

interface Technician {
  id: number;
  name: string;
}

const TechnicianForm: React.FC<{ onTechnicianAdded: () => void }> = ({ onTechnicianAdded }) => {
  const [name, setName] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    apiClient.post('/technicians', { name })
      .then(() => {
        setName('');
        onTechnicianAdded();
      });
  };

  return (
    <div className="mb-4">
      <h2>Adicionar Novo Técnico</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome do Técnico</label>
          <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary mt-2">Adicionar Técnico</button>
      </form>
    </div>
  );
};

const TechnicianList: React.FC<{ technicians: Technician[] }> = ({ technicians }) => {
  return (
    <div>
      <h2>Técnicos Registados</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
          </tr>
        </thead>
        <tbody>
          {technicians.map(technician => (
            <tr key={technician.id}>
              <td>{technician.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TechniciansPage: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const fetchTechnicians = () => {
    apiClient.get('/technicians').then(response => {
      setTechnicians(response.data);
    });
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  return (
    <div className="container mt-4">
      <TechnicianForm onTechnicianAdded={fetchTechnicians} />
      <TechnicianList technicians={technicians} />
    </div>
  );
};

export default TechniciansPage;