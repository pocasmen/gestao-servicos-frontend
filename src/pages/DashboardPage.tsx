import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

interface DashboardStats {
  tickets: {
    open: number;
    scheduled: number;
    closed: number;
  };
  weekly: {
    total: number;
    completed: number;
    withReport: number;
  };
  overdue: number;
  pendingReports: {
    total: number;
    completed: number;
    overdue: number;
  };
}

interface TicketDetail {
  id: number;
  subject: string;
  clientName: string;
  status: string;
  priority: string;
  date: string;
}

interface ScheduleDetail {
  id: number;
  title: string;
  startDate?: string;
  endDate?: string;
  isCompleted?: boolean;
  hasReport?: boolean;
  clientName: string;
  technicians: string[];
}

const DistributionBar: React.FC<{
  fechados: number;
  concluidos: number;
  overdue: number;
  pendente: number;
  total: number;
}> = ({ fechados, concluidos, overdue, pendente, total }) => {
  const getW = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="visualizer-container">
      <div className="visual-title">Distribuição de Agendamentos</div>
      <div className="dist-bar-container">
        <div className="dist-bar-segment bg-emerald" style={{ width: `${getW(fechados)}%` }} data-label={`Fechados: ${fechados}`} />
        <div className="dist-bar-segment bg-azure" style={{ width: `${getW(concluidos)}%` }} data-label={`Concluídos: ${concluidos}`} />
        <div className="dist-bar-segment bg-ruby" style={{ width: `${getW(overdue)}%` }} data-label={`Por fechar: ${overdue}`} />
        <div className="dist-bar-segment bg-white opacity-25" style={{ width: `${getW(pendente)}%` }} data-label={`Pendente: ${pendente}`} />
      </div>
    </div>
  );
};

const ReportDistributionBar: React.FC<{
  fechados: number;
  overdue: number;
  total: number;
}> = ({ fechados, overdue, total }) => {
  const getW = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="visualizer-container">
      <div className="dist-bar-container">
        <div className="dist-bar-segment bg-azure" style={{ width: `${getW(fechados)}%` }} data-label={`Concluídos: ${fechados}`} />
        <div className="dist-bar-segment bg-ruby" style={{ width: `${getW(overdue)}%` }} data-label={`Por fechar: ${overdue}`} />
      </div>
      <div className="dist-legend">
        <div className="legend-item"><span className="dot bg-azure"></span> Concluídos</div>
        <div className="legend-item"><span className="dot bg-ruby"></span> Por fechar</div>
      </div>
    </div>
  );
};

const PerformanceGauge: React.FC<{ percentage: number; label: string }> = ({ percentage, label }) => {
  // Converte porcentagem (0-100) para rotação (-90 a 90 graus)
  // 0% = -90deg (Esquerda), 50% = 0deg (Topo), 100% = 90deg (Direita)
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="visualizer-container mb-3 text-center">
      <div className="visual-title mb-2">Índice de Performance</div>
      <div className="gauge-wrapper mx-auto" style={{ width: '220px', height: 'auto' }}>
        <svg viewBox="0 0 100 65" className="gauge-svg" style={{ width: '100%', height: 'auto' }}>
          {/* Fundo Desfocado / Glassmorphism de base */}
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round" />

          {/* Zonas de Cores */}
          <path d="M10,50 A40,40 0 0,1 50,10" fill="none" stroke="#ef4444" strokeWidth="10" />
          <path d="M50,10 A40,40 0 0,1 78.3,21.7" fill="none" stroke="#fde047" strokeWidth="10" />
          <path d="M78.3,21.7 A40,40 0 0,1 90,50" fill="none" stroke="#10b981" strokeWidth="10" />

          {/* Ponteiro */}
          <g transform={`rotate(${rotation}, 50, 50)`}>
            <line x1="50" y1="50" x2="50" y2="15" stroke="#fff" strokeWidth="3" strokeLinecap="round" className="gauge-pointer" />
            <circle cx="50" cy="50" r="4" fill="#fff" />
          </g>
        </svg>
        {/* Legenda FORA da zona do arco */}
        <div className="gauge-legend mt-1">
          <div className="fw-bold h3 mb-0 text-white">{Math.round(percentage)}%</div>
          <div className="small opacity-75 fw-bold text-uppercase">{label}</div>
        </div>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<ScheduleDetail[]>([]);
  const [pendingReports, setPendingReports] = useState<ScheduleDetail[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'tickets' | 'schedules' | 'reports' | null>(null);

  // Navegação
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [baseDate, setBaseDate] = useState(new Date());

  const dateRange = React.useMemo(() => {
    const start = new Date(baseDate);
    const end = new Date(baseDate);

    if (viewMode === 'week') {
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);

      // Ajuste para Sexta-feira (Segunda + 4 dias)
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 4);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [baseDate, viewMode]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        };

        const [statsRes, schedulesRes, reportsRes, ticketsRes] = await Promise.all([
          apiClient.get('/api/dashboard/stats', { params }),
          apiClient.get('/api/dashboard/weekly-schedules', { params }),
          apiClient.get('/api/dashboard/pending-reports', { params }),
          apiClient.get('/api/tickets') // Fetching all/recent tickets. Assuming endpoint exists.
        ]);
        setStats(statsRes.data);

        // Map and sort tickets (Recent 10)
        const ticketsData = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
        const sortedTickets = ticketsData.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 10).map((t: any) => ({
          id: t.id,
          subject: t.subject || 'Sem Assunto',
          clientName: t.clients?.name || 'Cliente Desconhecido',
          status: t.status,
          priority: t.priority,
          date: t.created_at
        }));
        setRecentTickets(sortedTickets);

        // Ordenar agendamentos: mais antigo para o mais recente (ascendente)
        const sortedSchedules = (schedulesRes.data as ScheduleDetail[]).sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        });
        setWeeklySchedules(sortedSchedules);

        // Ordenar relatórios: mais antigo para o mais recente (ascendente)
        const sortedReports = (reportsRes.data as ScheduleDetail[]).sort((a, b) => {
          const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
          const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
          return dateA - dateB;
        });
        setPendingReports(sortedReports);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  const navigate = (direction: number) => {
    const newDate = new Date(baseDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setBaseDate(newDate);
  };

  const rangeLabel = React.useMemo(() => {
    if (viewMode === 'week') {
      const startStr = dateRange.start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
      const endStr = dateRange.end.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
      return `Semana de ${startStr} a ${endStr}`;
    } else {
      return dateRange.start.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    }
  }, [dateRange, viewMode]);

  const weeklyStats = React.useMemo(() => {
    const statsObj = { total: weeklySchedules.length, completed: 0, withReport: 0, overdue: 0, pending: 0 };
    const now = new Date();

    weeklySchedules.forEach(s => {
      // Mesma lógica exata das badges da tabela
      if (s.hasReport) {
        statsObj.withReport++; // Badge Verde: "Com relatório" -> "Fechados"
      } else if (s.isCompleted) {
        statsObj.completed++;  // Badge Azul: "Concluído" -> "Concluídos"
      } else if (s.endDate && new Date(s.endDate) < now) {
        statsObj.overdue++;    // Badge Vermelha: "Por fechar"
      } else {
        statsObj.pending++;    // "Pendente"
      }
    });
    return statsObj;
  }, [weeklySchedules]);

  if (loading) {
    return <div className="container mt-4">A carregar...</div>;
  }

  if (error) {
    return <div className="container mt-4 alert alert-danger">{error}</div>;
  }

  return (
    <div className="container py-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h1 className="display-4 fw-bold mb-0">Dashboard</h1>
          <p className="text-muted mb-0">Controlo de operações e métricas de serviço.</p>
        </div>

        <div className="d-flex align-items-center gap-2 bg-white p-2 rounded-4 shadow-sm border border-light">
          <div className="btn-group me-3">
            <button
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-secondary border-0'}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-secondary border-0'}`}
              onClick={() => setViewMode('month')}
            >
              Mês
            </button>
          </div>

          <div className="d-flex align-items-center gap-3 px-3 border-start">
            <button className="btn btn-outline-primary btn-sm rounded-circle" onClick={() => navigate(-1)}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="fw-bold text-capitalize" style={{ minWidth: '180px', textAlign: 'center' }}>
              {rangeLabel}
            </span>
            <button className="btn btn-outline-primary btn-sm rounded-circle" onClick={() => navigate(1)}>
              <i className="bi bi-chevron-right"></i>
            </button>
            <button className="btn btn-light btn-sm ms-2" onClick={() => setBaseDate(new Date())} title="Hoje">
              Hoje
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-5">
        {stats && (
          <>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Total de Tickets"
                value={stats.tickets.open + stats.tickets.scheduled + stats.tickets.closed}
                linkTo="#"
                onClick={() => setActiveSection('tickets')}
                icon="bi bi-ticket-perforated"
                color="primary"
                details={[
                  { label: 'Abertos', value: stats.tickets.open },
                  { label: 'Agendados', value: stats.tickets.scheduled },
                  { label: 'Fechados', value: stats.tickets.closed }
                ]}
              />
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title={`Agendamentos ${viewMode === 'week' ? 'Semana' : 'Mês'}`}
                value={weeklyStats.total}
                linkTo="#"
                onClick={() => setActiveSection('schedules')}
                icon="bi bi-calendar-week"
                color="warning"
                details={[
                  { label: 'Fechados', value: weeklyStats.withReport, colorClass: 'bg-emerald' },
                  { label: 'Concluídos', value: weeklyStats.completed, colorClass: 'bg-azure' },
                  { label: 'Por fechar', value: weeklyStats.overdue, colorClass: 'bg-ruby' },
                  { label: 'Pendentes', value: weeklyStats.pending, colorClass: 'bg-cloud' }
                ]}
                extra={
                  <>
                    <DistributionBar
                      fechados={weeklyStats.withReport}
                      concluidos={weeklyStats.completed}
                      overdue={weeklyStats.overdue}
                      pendente={weeklyStats.pending}
                      total={weeklyStats.total}
                    />
                    <div className="mb-4"></div>
                    <PerformanceGauge
                      percentage={(weeklyStats.withReport + weeklyStats.completed + weeklyStats.overdue) > 0
                        ? (weeklyStats.withReport / (weeklyStats.withReport + weeklyStats.completed + weeklyStats.overdue)) * 100
                        : 0}
                      label="EFICIÊNCIA DE FECHO"
                    />
                  </>
                }
              />
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Relatórios Pendentes"
                value={stats.pendingReports.total}
                linkTo="#"
                onClick={() => setActiveSection('reports')}
                icon="bi bi-file-earmark-text"
                color="danger"
                details={[
                  { label: 'Concluídos', value: stats.pendingReports.completed, colorClass: 'bg-azure' },
                  { label: 'Por fechar', value: stats.pendingReports.overdue, colorClass: 'bg-ruby' }
                ]}
                extra={
                  <ReportDistributionBar
                    fechados={stats.pendingReports.completed}
                    overdue={stats.pendingReports.overdue}
                    total={stats.pendingReports.total}
                  />
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="row g-4 transition-fade">
        {activeSection === 'tickets' && (
          <div className="col-12">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h3 className="h5 fw-bold mb-4">Tickets Recentes</h3>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>Ver</th>
                      <th>Estado</th>
                      <th>Assunto</th>
                      <th>Cliente</th>
                      <th>Prioridade</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map(t => (
                      <tr key={t.id}>
                        <td>
                          <Link to={`/tickets/${t.id}`} className="btn btn-sm btn-outline-primary border-0">
                            <i className="bi bi-search"></i>
                          </Link>
                        </td>
                        <td>
                          <span className={`badge bg-${t.status === 'closed' ? 'success' : t.status === 'open' ? 'danger' : 'warning'}`}>
                            {t.status === 'closed' ? 'Fechado' : t.status === 'open' ? 'Aberto' : 'Agendado'}
                          </span>
                        </td>
                        <td>{t.subject}</td>
                        <td>{t.clientName}</td>
                        <td> <span className={`badge bg-${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'info'}`}>{t.priority}</span></td>
                        <td><div className="small text-muted">{new Date(t.date).toLocaleDateString('pt-PT')}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'schedules' && (
          <div className="col-12">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h3 className="h5 fw-bold mb-4">Lista de Agendamentos ({weeklySchedules.length})</h3>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>Ver</th>
                      <th>Estado</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Técnico(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySchedules.map(s => (
                      <tr key={s.id}>
                        <td>
                          <Link
                            to="/calendar"
                            state={{ scheduleToEditId: s.id }}
                            className="btn btn-sm btn-outline-primary border-0"
                            title="Ver detalhes"
                          >
                            <i className="bi bi-search"></i>
                          </Link>
                        </td>
                        <td>
                          {s.hasReport ? (
                            <span className="badge bg-success">Fechado</span>
                          ) : s.isCompleted ? (
                            <span className="badge bg-primary">Concluído</span>
                          ) : s.endDate && new Date(s.endDate) < new Date() ? (
                            <span className="badge bg-danger">Por fechar</span>
                          ) : (
                            <span className="badge bg-secondary">Pendente</span>
                          )}
                        </td>
                        <td>
                          <div className="small text-muted">
                            {s.startDate ? new Date(s.startDate).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </td>
                        <td>{s.clientName}</td>
                        <td>{s.technicians.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'reports' && (
          <div className="col-12">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h3 className="h5 fw-bold mb-4">Relatórios Pendentes ({pendingReports.length})</h3>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>Ver</th>
                      <th>Estado</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Técnico(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReports.map(s => (
                      <tr key={s.id}>
                        <td>
                          <Link
                            to="/calendar"
                            state={{ scheduleToEditId: s.id }}
                            className="btn btn-sm btn-outline-primary border-0"
                            title="Ver detalhes"
                          >
                            <i className="bi bi-search"></i>
                          </Link>
                        </td>
                        <td>
                          {s.hasReport ? (
                            <span className="badge bg-success">Com relatório</span>
                          ) : s.isCompleted ? (
                            <span className="badge bg-primary">Concluído</span>
                          ) : s.endDate && new Date(s.endDate) < new Date() ? (
                            <span className="badge bg-danger">Por fechar</span>
                          ) : (
                            <span className="badge bg-secondary">Pendente</span>
                          )}
                        </td>
                        <td>
                          <div className="small text-muted">
                            {s.endDate ? new Date(s.endDate).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </td>
                        <td>{s.clientName}</td>
                        <td>{s.technicians.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
