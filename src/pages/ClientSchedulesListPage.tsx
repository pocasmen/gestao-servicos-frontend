import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { format, isFuture, isPast } from 'date-fns';
import { Ticket } from '../types';
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

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
  const { alert } = useConfirm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schedulesRes, ticketsRes] = await Promise.all([
          apiClient.get('/api/my-schedules?page=1&limit=50'),
          apiClient.get('/api/my-tickets?page=1&limit=50')
        ]);

        // Handle paginated response structure
        const schedulesData = schedulesRes.data.data ? schedulesRes.data.data : schedulesRes.data;
        const ticketsData = ticketsRes.data.data ? ticketsRes.data.data : ticketsRes.data;

        // Filter for Future Schedules (Not Completed)
        const activeSchedules = (Array.isArray(schedulesData) ? schedulesData : []).filter((s: any) => !s.isCompleted);

        // Filter for Open Tickets (Not Closed)
        const activeTickets = (Array.isArray(ticketsData) ? ticketsData : []).filter((t: any) => t.status !== 'closed' && t.status !== 'deleted');

        setSchedules(activeSchedules);
        setTickets(activeTickets);
      } catch (err) {
        logger.error(err, 'Erro ao carregar dados:');
        alert('Ocorreu um erro ao carregar os seus serviços.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="container-fluid mt-4">A carregar serviços...</div>;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Serviços e Tickets Ativos</h4>
        </div>
        <div className="card-body">

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
