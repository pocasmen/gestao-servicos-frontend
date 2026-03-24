import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { format } from 'date-fns';
import { Ticket } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

interface ClientSchedule {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    isCompleted: boolean;
    hasReport: boolean;
    isSigned?: boolean;
    serviceType: string;
    technicians: any[];
    equipmentInfo: string;
    equipmentId?: number;
}

const ClientHistoryPage: React.FC = () => {
    const [schedules, setSchedules] = useState<ClientSchedule[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const { alert, confirm } = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();
    const [filterEquipmentId, setFilterEquipmentId] = useState<number | null>(null);

    useEffect(() => {
        if (location.state && (location.state as any).equipmentId) {
            setFilterEquipmentId((location.state as any).equipmentId);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [schedulesRes, ticketsRes] = await Promise.all([
                    apiClient.get('/api/client-portal/my-schedules?page=1&limit=50'),
                    apiClient.get('/api/client-portal/my-tickets?page=1&limit=50')
                ]);

                // Handle paginated response structure
                const schedulesData = schedulesRes.data.data ? schedulesRes.data.data : schedulesRes.data;
                const ticketsData = ticketsRes.data.data ? ticketsRes.data.data : ticketsRes.data;

                // Filter for History: Completed Schedules
                let historySchedules = (Array.isArray(schedulesData) ? schedulesData : []).filter((s: any) => s.isCompleted);

                // Filter for History: Closed Tickets
                let historyTickets = (Array.isArray(ticketsData) ? ticketsData : []).filter((t: any) => t.status === 'closed');

                setSchedules(historySchedules);
                setTickets(historyTickets);
            } catch (err) {
                logger.error(err, 'Erro ao carregar histórico:');
                alert('Ocorreu um erro ao carregar o histórico.');
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
            const response = await apiClient.get(`/api/client-portal/my-report/by-schedule/${scheduleId}`);
            if (response.data && response.data.id) {
                navigate(`/report/print/${response.data.id}`);
            } else {
                alert("Relatório não encontrado.");
            }
        } catch (error) {
            logger.error(error, "Erro ao carregar o relatório:");
            alert("Não foi possível carregar o relatório. Por favor, tente mais tarde.");
        }
    };

    const handleSignReport = async (scheduleId: number) => {
        try {
            const response = await apiClient.get(`/api/client-portal/my-report/by-schedule/${scheduleId}`);
            if (!response.data || !response.data.id) {
                alert("Relatório não encontrado.");
                return;
            }
            
            const reportId = response.data.id;

            await apiClient.post(`/api/client-portal/my-report/${reportId}/sign`);
            alert("Relatório assinado digitalmente com sucesso!");

            // Atualizar o estado local para remover o botão de assinar
            setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, isSigned: true } : s));
            setTickets(prev => prev.map(t => t.scheduleId === scheduleId ? { ...t, isSigned: true } : t));
        } catch (error: any) {
            logger.error(error, "Erro ao assinar o relatório:");
            
            const errorMessage = error.response?.data?.error || "";
            if (errorMessage.toLowerCase().includes("assinatura")) {
                const proceed = await confirm({
                    title: "Assinatura em Falta",
                    message: "Não tem uma assinatura definida no seu perfil. Deseja ir para o perfil agora para definir uma?",
                    confirmText: "Ir para o Perfil",
                    cancelText: "Agora não"
                });
                
                if (proceed) {
                    navigate('/portal/profile');
                }
            } else {
                alert(error.response?.data?.error || "Não foi possível assinar o relatório digitalmente. Por favor, tente mais tarde.");
            }
        }
    };

    const filteredSchedules = filterEquipmentId
        ? schedules.filter(s => s.equipmentId === filterEquipmentId)
        : schedules;

    const filteredTickets = filterEquipmentId
        ? tickets.filter(t => t.equipmentId === filterEquipmentId)
        : tickets;

    if (loading) {
        return <div className="container-fluid mt-4">A carregar histórico...</div>;
    }

    return (
        <div className="container-fluid mt-4">
            <div className="card shadow-sm">
                <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Histórico de Atividade</h4>
                    {filterEquipmentId && (
                        <button className="btn btn-sm btn-light" onClick={() => setFilterEquipmentId(null)}>
                            Limpar Filtro de Equipamento
                        </button>
                    )}
                </div>
                <div className="card-body">

                    {/* Section: Past Schedules (Services) */}
                    <h5 className="mb-3 text-secondary border-bottom pb-2">Serviços Realizados</h5>
                    {filteredSchedules.length === 0 ? (
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
                                    {filteredSchedules.map((schedule) => (
                                        <tr key={schedule.id}>
                                            <td>
                                                <div className="fw-bold">{format(new Date(schedule.startDate), 'dd/MM/yyyy')}</div>
                                                <small className="text-muted">{format(new Date(schedule.startDate), 'HH:mm')}</small>
                                            </td>
                                            <td>{schedule.title.split(' - ')[0]}</td>
                                            <td>{schedule.equipmentInfo}</td>
                                            <td>{schedule.technicians.map((t: any) => typeof t === 'object' ? t.name : t).join(', ') || 'N/A'}</td>
                                             <td>
                                                 {schedule.hasReport ? (
                                                     <div className="d-flex gap-2">
                                                         <button
                                                             className="btn btn-sm btn-outline-primary"
                                                             onClick={() => handleViewReport(schedule.id, 'schedule')}
                                                             title="Ver Relatório"
                                                         >
                                                             <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                                                             Relatório
                                                         </button>
                                                         {!schedule.isSigned && (
                                                            <button
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => handleSignReport(schedule.id)}
                                                                title="Assinar Relatório"
                                                            >
                                                                <i className="bi bi-pencil-fill me-1"></i>
                                                                Assinar
                                                            </button>
                                                         )}
                                                     </div>
                                                 ) : (
                                                     <span className="badge bg-secondary">Relatório em Elaboração</span>
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
                    {filteredTickets.length === 0 ? (
                        <p className="text-muted fst-italic">Sem tickets fechados.</p>
                    ) : (
                        <div className="list-group">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.id} className="list-group-item list-group-item-action flex-column align-items-start">
                                    <div className="d-flex w-100 justify-content-between">
                                        <h6 className="mb-1">#{ticket.id} - {ticket.title.split(' - ')[0]}</h6>
                                        <small className="text-muted">{format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</small>
                                    </div>
                                    <p className="mb-1">{ticket.equipmentInfo}</p>
                                    <small className="text-muted">{ticket.faultDescription}</small>
                                     <div className="mt-2 d-flex gap-2 align-items-center">
                                         <Link to={`/portal/tickets/${ticket.id}`} className="btn btn-sm btn-outline-secondary">
                                             <i className="bi bi-info-circle-fill me-1"></i>
                                             Detalhes
                                         </Link>
                                         {ticket.scheduleId && (
                                             ticket.hasReport ? (
                                                 <div className="d-inline-flex gap-2">
                                                     <button
                                                         className="btn btn-sm btn-outline-primary"
                                                         onClick={() => handleViewReport(ticket.scheduleId!, 'schedule')}
                                                         title="Ver Relatório"
                                                     >
                                                         <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                                                         Relatório
                                                     </button>
                                                     {!ticket.isSigned && (
                                                         <button
                                                             className="btn btn-sm btn-outline-success"
                                                             onClick={() => handleSignReport(ticket.scheduleId!)}
                                                             title="Assinar Relatório Digitalmente"
                                                         >
                                                             <i className="bi bi-pencil-fill me-1"></i>
                                                             Assinar
                                                         </button>
                                                     )}
                                                 </div>
                                             ) : (
                                                 <span className="badge bg-secondary">Relatório em Elaboração</span>
                                             )
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
