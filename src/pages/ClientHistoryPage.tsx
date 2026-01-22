import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { format } from 'date-fns';
import { Ticket } from '../types';
import { Link, useNavigate } from 'react-router-dom';

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

const ClientHistoryPage: React.FC = () => {
    const [schedules, setSchedules] = useState<ClientSchedule[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [schedulesRes, ticketsRes] = await Promise.all([
                    apiClient.get('/api/my-schedules'),
                    apiClient.get('/api/my-tickets')
                ]);

                // Filter for History: Completed Schedules
                const historySchedules = schedulesRes.data.filter((s: ClientSchedule) => s.isCompleted);

                // Filter for History: Closed Tickets
                const historyTickets = ticketsRes.data.filter((t: Ticket) => t.status === 'closed');

                setSchedules(historySchedules);
                setTickets(historyTickets);
                setError('');
            } catch (err) {
                console.error('Erro ao carregar histórico:', err);
                setError('Ocorreu um erro ao carregar o histórico.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewReport = async (ticketOrScheduleId: number, type: 'ticket' | 'schedule') => {
        let scheduleId = ticketOrScheduleId;

        // If it's a ticket, we need the scheduleId from it. 
        if (type === 'ticket') {
            return;
        }

        try {
            // First we need the report ID. We can fetch it by schedule ID.
            const response = await apiClient.get(`/api/my-report/by-schedule/${scheduleId}`);
            if (response.data && response.data.id) {
                navigate(`/report/print/${response.data.id}`);
            } else {
                setError("Relatório não encontrado.");
            }
        } catch (error) {
            console.error("Erro ao carregar o relatório:", error);
            setError("Não foi possível carregar o relatório. Por favor, tente mais tarde.");
        }
    };

    if (loading) {
        return <div className="container mt-4">A carregar histórico...</div>;
    }

    return (
        <div className="container mt-4" style={{ maxWidth: '1000px' }}>
            <div className="card shadow-sm">
                <div className="card-header bg-secondary text-white">
                    <h4 className="mb-0">Histórico de Atividade</h4>
                </div>
                <div className="card-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    {/* Section: Past Schedules (Services) */}
                    <h5 className="mb-3 text-secondary border-bottom pb-2">Serviços Realizados</h5>
                    {schedules.length === 0 ? (
                        <p className="text-muted fst-italic mb-4">Sem histórico de serviços.</p>
                    ) : (
                        <div className="table-responsive mb-4">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Data</th>
                                        <th>Serviço</th>
                                        <th>Equipamento</th>
                                        <th>Técnico(s)</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map((schedule) => (
                                        <tr key={schedule.id}>
                                            <td>
                                                <div className="fw-bold">{format(new Date(schedule.startDate), 'dd/MM/yyyy')}</div>
                                                <small className="text-muted">{format(new Date(schedule.startDate), 'HH:mm')}</small>
                                            </td>
                                            <td>{schedule.title}</td>
                                            <td>{schedule.equipmentInfo}</td>
                                            <td>{schedule.technicians.join(', ') || 'N/A'}</td>
                                            <td>
                                                {schedule.hasReport && (
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleViewReport(schedule.id, 'schedule')}
                                                    >
                                                        Ver Relatório
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Section: Closed Tickets */}
                    <h5 className="mb-3 text-secondary border-bottom pb-2">Tickets Fechados</h5>
                    {tickets.length === 0 ? (
                        <p className="text-muted fst-italic">Sem tickets fechados.</p>
                    ) : (
                        <div className="list-group">
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="list-group-item list-group-item-action flex-column align-items-start">
                                    <div className="d-flex w-100 justify-content-between">
                                        <h6 className="mb-1">#{ticket.id} - {ticket.title}</h6>
                                        <small className="text-muted">{format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</small>
                                    </div>
                                    <p className="mb-1">{ticket.equipmentInfo}</p>
                                    <small className="text-muted">{ticket.faultDescription}</small>
                                    <div className="mt-2">
                                        <Link to={`/portal/tickets/${ticket.id}`} className="btn btn-sm btn-link ps-0">Ver Detalhes</Link>
                                        {ticket.hasReport && ticket.scheduleId && (
                                            <button
                                                className="btn btn-sm btn-outline-primary ms-2"
                                                onClick={() => handleViewReport(ticket.scheduleId!, 'schedule')}
                                            >
                                                Ver Relatório
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientHistoryPage;
