import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { format, isFuture, isPast } from 'date-fns';
import { Ticket } from '../types';
import { Link } from 'react-router-dom';

interface ClientSchedule {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  hasReport: boolean;
  serviceType: string;
  technicians: string[];
  equipmentInfo: string;
}

const ClientSchedulesListPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ClientSchedule[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schedulesRes, ticketsRes] = await Promise.all([
          apiClient.get('/api/my-schedules'),
          apiClient.get('/api/my-tickets')
        ]);

        // Filter for Future Schedules (Not Completed)
        // Filter also by date? User said "serviços futuros, ou seja, foram agendados mais ainda não foram concluidos".
        // Usually !isCompleted implies it's future or in progress or delayed. I will stick to !isCompleted.
        const activeSchedules = schedulesRes.data.filter((s: ClientSchedule) => !s.isCompleted);

        // Filter for Open Tickets (Not Closed)
        // Assuming status 'closed' means done. 'deleted' should probably be ignored too.
        const activeTickets = ticketsRes.data.filter((t: Ticket) => t.status !== 'closed' && t.status !== 'deleted');

        setSchedules(activeSchedules);
        setTickets(activeTickets);
        setError('');
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar os seus serviços.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="container mt-4">A carregar serviços...</div>;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1000px' }}>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Serviços e Tickets Ativos</h4>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Section: Future/Active Schedules */}
          <h5 className="mb-3 text-primary border-bottom pb-2">Agendamentos Confirmados</h5>
          {schedules.length === 0 ? (
            <p className="text-muted fst-italic mb-4">Não tem agendamentos pendentes.</p>
          ) : (
            <div className="table-responsive mb-4">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Data</th>
                    <th>Serviço</th>
                    <th>Equipamento</th>
                    <th>Técnico(s)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>
                        <div className="fw-bold">{format(new Date(schedule.startDate), 'dd/MM/yyyy')}</div>
                        <small className="text-muted">{format(new Date(schedule.startDate), 'HH:mm')} - {format(new Date(schedule.endDate), 'HH:mm')}</small>
                      </td>
                      <td>{schedule.title}</td>
                      <td>{schedule.equipmentInfo}</td>
                      <td>{schedule.technicians.join(', ') || 'N/A'}</td>
                      <td><span className="badge bg-warning text-dark">Pendente</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Open Tickets */}
          <h5 className="mb-3 text-primary border-bottom pb-2">Tickets em Aberto</h5>
          {tickets.length === 0 ? (
            <p className="text-muted fst-italic">Não tem tickets em aberto.</p>
          ) : (
            <div className="list-group">
              {tickets.map((ticket) => (
                <Link to={`/portal/tickets/${ticket.id}`} key={ticket.id} className="list-group-item list-group-item-action">
                  <div className="d-flex w-100 justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">#{ticket.id} - {ticket.title}</h6>
                      <small className="text-muted">{ticket.equipmentInfo}</small>
                    </div>
                    <span className={`badge ${ticket.status === 'open' ? 'bg-danger' : 'bg-info'}`}>
                      {ticket.status === 'open' ? 'Aberto' : 'Agendado'}
                    </span>
                  </div>
                  <p className="mb-1 mt-2 small text-muted">{ticket.faultDescription}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientSchedulesListPage;
