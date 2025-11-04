import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { Link } from 'react-router-dom';

// Interfaces
interface Report { id: number; clientId: number; equipmentId: number; serviceDate: string; hours: number; parts: string; description: string; serviceType: string; }
interface Client { id: number; name: string; }
interface Equipment { id: number; brand: string; model: string; }

// Formulário de Relatório
const ReportForm: React.FC<{ onReportAdded: () => void }> = ({ onReportAdded }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [parts, setParts] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('');

  // Carregar clientes
  useEffect(() => {
    apiClient.get('/clients').then(res => setClients(res.data));
  }, []);

  // Carregar equipamentos QUANDO o cliente muda
  useEffect(() => {
    if (clientId) {
      apiClient.get(`/equipments/client/${clientId}`)
        .then(res => setEquipments(res.data));
    } else {
      setEquipments([]);
    }
    setEquipmentId(''); // Limpar seleção de equipamento
  }, [clientId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceType || !clientId || !equipmentId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    apiClient.post('/reports', { clientId, equipmentId, serviceDate, hours, parts, description, serviceType })
      .then(() => {
        setClientId('');
        setEquipmentId('');
        setServiceDate('');
        setHours('');
        setParts('');
        setDescription('');
        setServiceType('');
        onReportAdded();
      });
  };

  return (
    <div className="mb-4">
      <h2>Novo Relatório de Intervenção</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Cliente</label>
          <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">Selecione um cliente...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Equipamento</label>
          <select className="form-control" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required disabled={!clientId}>
            <option value="">Selecione um equipamento...</option>
            {equipments.map(equipment => <option key={equipment.id} value={equipment.id}>{equipment.brand} {equipment.model}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Tipo de Serviço</label>
          <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
            <option value="">Selecione um tipo...</option>
            <option value="manutencao">Manutenção</option>
            <option value="reparacao">Reparação</option>
            <option value="assistencia">Assistência</option>
            <option value="instalacao">Instalação</option>
          </select>
        </div>
        <div className="form-group">
          <label>Data do Serviço</label>
          <input type="date" className="form-control" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Nº de Horas</label>
          <input type="number" className="form-control" value={hours} onChange={e => setHours(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Peças Utilizadas</label>
          <textarea className="form-control" value={parts} onChange={e => setParts(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Descrição do Serviço</label>
          <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary mt-2">Criar Relatório</button>
      </form>
    </div>
  );
};

// Lista de Relatórios
const ReportList: React.FC<{ reports: Report[] }> = ({ reports }) => {
  return (
    <div>
      <h2>Histórico de Relatórios</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Cliente (ID)</th>
            <th>Equipamento (ID)</th>
            <th>Data</th>
            <th>Tipo de Serviço</th>
            <th>Horas</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => (
            <tr key={report.id}>
              <td>{report.clientId}</td>
              <td>{report.equipmentId}</td>
              <td>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
              <td>{report.serviceType}</td>
              <td>{report.hours}</td>
              <td>
                <Link to={`/report/print/${report.id}`} className="btn btn-sm btn-outline-primary" target="_blank">
                  Ver / Imprimir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Página de Relatórios
const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  const fetchReports = () => {
    apiClient.get('/reports').then(response => {
      setReports(response.data);
    });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="container mt-4">
      <ReportForm onReportAdded={fetchReports} />
      <ReportList reports={reports} />
    </div>
  );
};

export default ReportsPage;
