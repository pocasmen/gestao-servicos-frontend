import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import StatCard from '../components/StatCard';
import { ActiveClientContext } from '../contexts/ActiveClientContext';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

interface ClientStats {
    tickets: {
        open: number;
        scheduled: number;
        closed: number;
        total: number;
    };
    schedules: {
        pending: number;
        completed: number;
        closed: number;
        overdue: number;
        total: number;
    };
    reports: {
        total: number;
    };
    equipments: {
        total: number;
    };
}

const ClientEntityDashboardPage: React.FC = () => {
    const { activeClient } = useContext(ActiveClientContext);
    const [stats, setStats] = useState<ClientStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { alert } = useConfirm();
    const navigate = useNavigate();

    useEffect(() => {
        if (!activeClient) {
            navigate('/portal');
            return;
        }

        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get('/api/client-portal/my-stats');
                setStats(res.data);
            } catch (error) {
                logger.error(error, "Failed to load client stats:");
                alert("Não foi possível carregar as métricas do dashboard.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [activeClient, navigate]);

    if (!activeClient) return null;

    if (loading) {
        return (
            <div className="container-fluid py-5">
                <div className="d-flex justify-content-center align-items-center mb-5" style={{ height: '30vh' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">A carregar...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-5">
            <div className="d-flex flex-column mb-5">
                <h1 className="display-5 fw-bold mb-0 text-primary">{activeClient.name}</h1>
                <p className="text-muted lead">Resumo geral do seu serviço e assistência.</p>
            </div>

            <div className="row g-4 mb-5">
                {stats && (
                    <>
                        <div className="col-12 col-md-6 col-xl-3">
                            <StatCard
                                title="Tickets de Assistência"
                                value={stats.tickets.total}
                                linkTo="/portal/tickets"
                                icon="bi bi-ticket-perforated"
                                color="primary"
                                details={[
                                    { label: 'Abertos', value: stats.tickets.open },
                                    { label: 'Agendados', value: stats.tickets.scheduled },
                                    { label: 'Fechados', value: stats.tickets.closed }
                                ]}
                            />
                        </div>
                        <div className="col-12 col-md-6 col-xl-3">
                            <StatCard
                                title="Agendamentos"
                                value={stats.schedules.total}
                                linkTo="/portal/schedules"
                                icon="bi bi-calendar-week"
                                color="warning"
                                details={[
                                    { label: 'Pendentes', value: stats.schedules.pending, colorClass: 'bg-cloud' },
                                    { label: 'Fechados', value: stats.schedules.closed, colorClass: 'bg-emerald' },
                                    { label: 'Concluídos', value: stats.schedules.completed, colorClass: 'bg-azure' },
                                    { label: 'Por fechar', value: stats.schedules.overdue, colorClass: 'bg-ruby' },
                                ]}
                            />
                        </div>
                        <div className="col-12 col-md-6 col-xl-3">
                            <StatCard
                                title="Histórico e Relatórios"
                                value={stats.reports.total + stats.tickets.closed + stats.schedules.completed}
                                linkTo="/portal/history"
                                icon="bi bi-file-earmark-text"
                                color="success"
                                details={[
                                    { label: 'Relatórios Emitidos', value: stats.reports.total },
                                    { label: 'Tickets Fechados', value: stats.tickets.closed },
                                    { label: 'Serviços Realizados', value: stats.schedules.completed }
                                ]}
                            />
                        </div>
                        <div className="col-12 col-md-6 col-xl-3">
                            <StatCard
                                title="Parque de Equipamentos"
                                value={stats.equipments.total}
                                linkTo="/portal/equipments"
                                icon="bi bi-cpu"
                                color="info"
                                details={[
                                    { label: 'Equipamentos Ativos', value: stats.equipments.total }
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientEntityDashboardPage;
