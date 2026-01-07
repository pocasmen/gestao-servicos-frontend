import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { Equipment } from '../types';

interface EquipmentHistory {
  details: Equipment & { clientName: string };
  tickets: any[];
  schedules: any[];
  reports: any[];
}

const EquipmentHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<EquipmentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      apiClient.get(`/api/equipments/${id}/history`)
        .then(response => {
          setHistory(response.data);
        })
        .catch(err => {
          console.error(`Erro ao carregar histórico do equipamento ${id}:`, err);
          setError('Não foi possível carregar o histórico do equipamento.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <div className="container mt-4">A carregar...</div>;
  }

  if (error) {
    return <div className="container mt-4 alert alert-danger">{error}</div>;
  }

  if (!history) {
    return <div className="container mt-4">Nenhum dado encontrado para este equipamento.</div>;
  }

  const { details, tickets, schedules, reports } = history;

  return (
    <div className="container mt-4">
      <h1 className="mb-3">Histórico do Equipamento</h1>

      <div className="row">
        {/* Left Column: Details */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header">
              <h3>{details.brand} {details.model}</h3>
            </div>
            <div className="card-body">
              <p><strong>Número de Série:</strong> {details.serialNumber}</p>
              <p><strong>Cliente:</strong> {details.clientName}</p>
            </div>
          </div>
        </div>

        {/* Right Column: History Tabs */}
        <div className="col-lg-8">
          <ul className="nav nav-tabs" id="historyTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button className="nav-link active" id="tickets-tab" data-bs-toggle="tab" data-bs-target="#tickets" type="button" role="tab">Tickets ({tickets.length})</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className="nav-link" id="schedules-tab" data-bs-toggle="tab" data-bs-target="#schedules" type="button" role="tab">Agendamentos ({schedules.length})</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className="nav-link" id="reports-tab" data-bs-toggle="tab" data-bs-target="#reports" type="button" role="tab">Relatórios ({reports.length})</button>
            </li>
          </ul>

          <div className="tab-content" id="historyTabsContent">
            <div className="tab-pane fade show active" id="tickets" role="tabpanel">
              <div className="table-responsive mt-3">
                <table className="table table-striped table-sm">
                  <thead><tr><th>ID</th><th>Data Criação</th><th>Descrição</th><th>Estado</th></tr></thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <tr key={ticket.id}>
                        <td><Link to="/tickets" state={{ ticketToHighlight: ticket.id }}>{ticket.id}</Link></td>
                        <td>{new Date(ticket.createdAt).toLocaleDateString('pt-PT')}</td>
                        <td>{ticket.faultDescription}</td>
                        <td><span className={`badge bg-${ticket.status === 'open' ? 'danger' : 'secondary'}`}>{ticket.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="tab-pane fade" id="schedules" role="tabpanel">
              <div className="table-responsive mt-3">
                <table className="table table-striped table-sm">
                  <thead><tr><th>ID</th><th>Data</th><th>Título</th><th>Técnicos</th><th>Concluído</th></tr></thead>
                  <tbody>
                    {schedules.map(schedule => (
                      <tr key={schedule.id}>
                        <td><Link to="/calendar" state={{ scheduleToEditId: schedule.id }}>{schedule.id}</Link></td>
                        <td>{new Date(schedule.startDate).toLocaleString('pt-PT')}</td>
                        <td>{schedule.title}</td>
                        <td>{schedule.technicians.join(', ')}</td>
                        <td>{schedule.isCompleted ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="tab-pane fade" id="reports" role="tabpanel">
              <div className="table-responsive mt-3">
                <table className="table table-striped table-sm">
                  <thead><tr><th>ID</th><th>Data</th><th>Horas</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td><Link to={`/report/print/${report.id}`} target="_blank">{report.id}</Link></td>
                        <td>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
                        <td>{report.hours}</td>
                        <td>{report.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentHistoryPage;
