import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import StatCard from '../components/StatCard';
import { ActiveClientContext } from '../contexts/ActiveClientContext';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { Building2, ShieldAlert } from 'lucide-react';

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
        withReport: number;
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
                <div className="d-flex align-items-center gap-3 mb-2">
                    <Building2 size={48} strokeWidth={2.5} className="text-primary" />
                    <h1 className="display-5 fw-bold mb-0 text-primary" style={{ color: 'var(--primary-color)' }}>{activeClient.name}</h1>
                </div>
                <p className="text-muted lead">Resumo geral do seu serviço e assistência.</p>
            </div>

            {activeClient.is_blacklisted && (
                <div className="alert border-0 shadow-lg rounded-4 mb-5 animate__animated animate__fadeInDown d-flex align-items-center gap-3 p-4"
                    style={{
                        background: 'linear-gradient(135deg, #f8d7da 0%, #f1aeb5 100%)',
                        boxShadow: '0 10px 30px rgba(220, 53, 69, 0.15)',
                        borderLeft: '8px solid #dc3545'
                    }}>
                    <div className="bg-white rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style={{ width: '70px', height: '70px' }}>
                        <ShieldAlert size={40} style={{ color: '#dc3545' }} strokeWidth={2.5} />
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <h6 className="alert-heading fw-bolder m-0 text-danger text-uppercase" style={{ fontSize: '1.2rem', letterSpacing: '0.05em' }}>
                                Regularização Financeira Pendente
                            </h6>
                        </div>
                        <p className="m-0 text-dark fw-bold" style={{ fontSize: '1rem', opacity: 0.9 }}>
                            Notamos que existem pendentes financeiros na sua conta. Para garantirmos a continuidade total e prioritária dos nossos serviços, solicitamos a regularização da situação o mais breve possível.
                        </p>
                        <small className="text-danger fw-bold mt-1 d-block">
                            <i className="bi bi-exclamation-circle-fill me-1"></i>
                            A abertura de novos pedidos e agendamentos poderá estar temporariamente limitada.
                        </small>
                    </div>
                </div>
            )}

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
                                value={stats.reports.total + stats.tickets.closed + Math.max(0, stats.schedules.completed - stats.schedules.withReport)}
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
