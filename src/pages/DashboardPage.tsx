import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { TicketStatus } from '../constants/enums';
import { getBillingStats, getBillingTasks } from '../services/billingService';
import { BillingStatus, BillingTask, ScheduleEvent, Ticket, DashboardStats, Technician } from '../types';
import { DashboardStatsSchema, TicketSchema, ScheduleEventSchema } from '../schemas';
import logger from '../utils/logger';

// DashboardStats now imported from types.ts

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'preventive': 'Preventiva',
  'corrective': 'Corretiva',
  'maintenance': 'Manutenção',
  'installation': 'Instalação',
  'other': 'Outro',
  'manutencao': 'Manutenção',
  'assistencia': 'Assistência',
  'remota': 'Remota'
};

const formatServiceType = (type: any) => {
  if (!type) return '';
  let cleanType = type;
  if (typeof type === 'string') {
    // Remove chavetas, parênteses retos e aspas da base de dados
    cleanType = type.replace(/[{}[\]"]/g, '').split(',')[0].trim();
  } else if (Array.isArray(type)) {
    cleanType = type[0];
  }
  
  if (!cleanType) return '';
  
  const label = SERVICE_TYPE_LABELS[cleanType.toLowerCase()];
  if (label) return label;
  
  // Fallback: Primeira letra maiúscula se não estiver no dicionário
  return cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
};

interface TicketDetail {
  id: number;
  subject: string;
  clientName: string;
  status: string;
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
  serviceType?: string;
  equipmentModel?: string;
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

const BillingDistributionBar: React.FC<{
  pendingCompletion: number;
  reportIssued: number;
  readyForBilling: number;
  billed: number;
  total: number;
}> = ({ pendingCompletion, reportIssued, readyForBilling, billed, total }) => {
  const getW = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="visualizer-container">
      <div className="visual-title">Distribuição de Faturação</div>
      <div className="dist-bar-container">
        <div className="dist-bar-segment" style={{ width: `${getW(pendingCompletion)}%`, backgroundColor: '#0dcaf0' }} data-label={`Pendentes: ${pendingCompletion}`} />
        <div className="dist-bar-segment" style={{ width: `${getW(reportIssued)}%`, backgroundColor: '#6c757d' }} data-label={`Por Validar: ${reportIssued}`} />
        <div className="dist-bar-segment" style={{ width: `${getW(readyForBilling)}%`, backgroundColor: '#ffc107' }} data-label={`Prontos: ${readyForBilling}`} />
        <div className="dist-bar-segment" style={{ width: `${getW(billed)}%`, backgroundColor: '#198754' }} data-label={`Faturados: ${billed}`} />
      </div>
    </div>
  );
};

const TaskDistributionBar: React.FC<{
  completed: number;
  pending: number;
  total: number;
}> = ({ completed, pending, total }) => {
  const getW = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="visualizer-container">
      <div className="visual-title">Estado das Tarefas</div>
      <div className="dist-bar-container">
        <div className="dist-bar-segment bg-azure" style={{ width: `${getW(completed)}%` }} data-label={`Concluídas: ${completed}`} />
        <div className="dist-bar-segment bg-ruby" style={{ width: `${getW(pending)}%` }} data-label={`Por concluir: ${pending}`} />
      </div>
      <div className="dist-legend">
        <div className="legend-item"><span className="dot bg-azure"></span> Concluídas</div>
        <div className="legend-item"><span className="dot bg-ruby"></span> Por concluir</div>
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
  const [billingStats, setBillingStats] = useState<{ total: number; pending_completion: number; report_issued: number; ready_for_billing: number; billed: number } | null>(null);
  const [billingTasks, setBillingTasks] = useState<BillingTask[]>([]);
  const [dashboardTasks, setDashboardTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { alert } = useConfirm();
  const [activeSection, setActiveSection] = useState<'tickets' | 'schedules' | 'reports' | 'billing' | 'tasks' | null>(null);

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

        const [statsRes, schedulesRes, reportsRes, ticketsRes, billingRes, billingTasksRes, tasksRes] = await Promise.all([
          apiClient.get('/api/dashboard/stats', { params }),
          apiClient.get('/api/dashboard/weekly-schedules', { params }),
          apiClient.get('/api/dashboard/pending-reports', { params }),
          apiClient.get('/api/tickets?status=all'), // Fetching all/recent tickets.
          getBillingStats(params),
          getBillingTasks(params),
          apiClient.get('/api/tasks')
        ]);
        const statsValidated = DashboardStatsSchema.safeParse(statsRes.data);
        if (statsValidated.success) {
          setStats(statsValidated.data);
        } else {
          logger.error(statsValidated.error.format(), '[SCHEMA_ERROR] Dashboard stats validation failed:');
          // Providencie estrutura mínima para evitar crashes
          setStats({
            tickets: { open: 0, scheduled: 0, closed: 0 },
            weekly: { total: 0, completed: 0, withReport: 0, overdue: 0 },
            pendingReports: { total: 0, completed: 0, overdue: 0 },
            tasks: { total: 0, completed: 0, pending: 0 },
            ...statsRes.data
          });
        }

        setBillingStats(billingRes);
        setBillingTasks(billingTasksRes);

        // Filter and sort dashboard tasks
        const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        const filteredTasks = allTasks.filter((t: any) => {
          const createdAt = t.created_at ? new Date(t.created_at) : null;
          const blocks = t.time_blocks || t.internal_task_time_blocks || [];
          if (blocks.length > 0) {
            return blocks.some((b: any) => {
              const bStart = new Date(b.start_time || b.start);
              return bStart >= dateRange.start && bStart <= dateRange.end;
            });
          }
          return createdAt && createdAt >= dateRange.start && createdAt <= dateRange.end;
        });
        setDashboardTasks(filteredTasks);

        // Map and sort tickets (Recent 10)
        const ticketsDataArray = ticketsRes.data.data ? ticketsRes.data.data : ticketsRes.data;
        const ticketsRaw = Array.isArray(ticketsDataArray) ? ticketsDataArray : [];
        const validatedTickets = ticketsRaw.map((t: unknown) => {
          const res = TicketSchema.safeParse(t);
          if (!res.success) {
            logger.error(res.error.format(), '[SCHEMA_ERROR] Dashboard ticket validation failed:');
            return t as Ticket;
          }
          return res.data;
        });

        const sortedTickets = validatedTickets
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
          .map(t => ({
            id: t.id,
            subject: t.title || 'Sem Assunto',
            clientName: t.clientName || 'Cliente Desconhecido',
            status: t.status,
            date: t.createdAt
          }));
        setRecentTickets(sortedTickets);

        // Ordenar agendamentos: mais antigo para o mais recente (ascendente)
        const rawSchedules = Array.isArray(schedulesRes.data) ? schedulesRes.data : [];
        const validatedSchedulesRaw = rawSchedules.map((s: unknown) => {
          const res = ScheduleEventSchema.safeParse(s);
          if (!res.success) {
            logger.error(res.error.format(), '[SCHEMA_ERROR] Dashboard schedule validation failed:');
            return s as any;
          }
          return res.data;
        });

        const sortedSchedules = validatedSchedulesRaw.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        }).map(s => ({
          id: Number(s.id),
          title: s.title || 'Sem Título',
          startDate: s.startDate,
          endDate: s.endDate,
          isCompleted: s.isCompleted,
          hasReport: s.hasReport,
          clientName: s.clientName || 'Desconhecido',
          technicians: (s.technicians || []).map((t: any) => typeof t === 'string' ? t : (t?.name || 'Tecnico')),
          serviceType: s.serviceType,
          equipmentModel: s.equipmentModel
        }));
        setWeeklySchedules(sortedSchedules);

        // Ordenar relatórios: mais antigo para o mais recente (ascendente)
        const rawReports = Array.isArray(reportsRes.data) ? reportsRes.data : [];
        const validatedReportsRaw = rawReports.map((s: unknown) => {
          const res = ScheduleEventSchema.safeParse(s);
          if (!res.success) {
            logger.error(res.error.format(), '[SCHEMA_ERROR] Dashboard report-schedule validation failed:');
            return s as any;
          }
          return res.data;
        });

        const sortedReports = validatedReportsRaw.sort((a, b) => {
          const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
          const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
          return dateA - dateB;
        }).map(s => ({
          id: Number(s.id),
          title: s.title || 'Sem Título',
          startDate: s.startDate,
          endDate: s.endDate,
          isCompleted: s.isCompleted,
          hasReport: s.hasReport,
          clientName: s.clientName || 'Desconhecido',
          technicians: (s.technicians || []).map((t: any) => typeof t === 'string' ? t : (t?.name || 'Tecnico')),
          serviceType: s.serviceType,
          equipmentModel: s.equipmentModel
        }));
        setPendingReports(sortedReports);
      } catch (err: unknown) {
        logger.error(err, "Erro ao carregar dados do dashboard:");
        alert("Não foi possível carregar os dados do dashboard.");
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
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '350px' }}></div>
          </div>
          <div className="skeleton rounded-4" style={{ width: '300px', height: '50px' }}></div>
        </div>
        <div className="row g-4 mb-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="col-12 col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm p-4" style={{ height: '220px' }}>
                <div className="d-flex justify-content-between mb-4">
                  <div className="skeleton skeleton-circle" style={{ width: '60px' }}></div>
                  <div style={{ textAlign: 'right', width: '60%' }}>
                    <div className="skeleton skeleton-title ms-auto"></div>
                    <div className="skeleton skeleton-text ms-auto"></div>
                  </div>
                </div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5 mt-2">
        <div>
          <h1 className="fw-bold m-0 animate__animated animate__fadeInLeft" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)', fontSize: '2.5rem' }}>Dashboard</h1>
          <p className="text-muted m-0 animate__animated animate__fadeInLeft animate__delay-1s">Bem-vindo à sua central de controlo operacional</p>
        </div>

        <div className="d-flex align-items-center gap-2 glass-card p-2 shadow-sm border animate__animated animate__fadeInRight">
          <div className="btn-group me-3 bg-light rounded-pill p-1">
            <button
              className={`btn btn-sm rounded-pill px-3 fw-bold transition-all ${viewMode === 'week' ? 'btn-primary shadow-sm' : 'btn-light text-muted border-0'}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn-sm rounded-pill px-3 fw-bold transition-all ${viewMode === 'month' ? 'btn-primary shadow-sm' : 'btn-light text-muted border-0'}`}
              onClick={() => setViewMode('month')}
            >
              Mês
            </button>
          </div>

          <div className="d-flex align-items-center gap-2 px-3 border-start">
            <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" onClick={() => navigate(-1)} style={{ width: '32px', height: '32px', padding: 0 }}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="fw-bold text-dark mx-2" style={{ minWidth: '160px', textAlign: 'center', fontSize: '0.9rem' }}>
              {rangeLabel}
            </span>
            <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" onClick={() => navigate(1)} style={{ width: '32px', height: '32px', padding: 0 }}>
              <i className="bi bi-chevron-right"></i>
            </button>
            <button className="btn btn-light btn-sm ms-2 rounded-pill px-3 fw-bold border shadow-sm" onClick={() => setBaseDate(new Date())}>
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
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Faturação"
                value={billingStats ? billingStats.total : 0}
                linkTo="#"
                onClick={() => setActiveSection('billing')}
                icon="bi bi-currency-euro"
                color="info"
                details={[
                  { label: 'Pendentes Finalização', value: billingStats?.pending_completion || 0, colorClass: 'bg-info' },
                  { label: 'Por Validar', value: billingStats?.report_issued || 0, colorClass: 'bg-secondary' },
                  { label: 'Prontos', value: billingStats?.ready_for_billing || 0, colorClass: 'bg-warning' },
                  { label: 'Faturados', value: billingStats?.billed || 0, colorClass: 'bg-success' }
                ]}
                extra={
                  <>
                    <BillingDistributionBar
                      pendingCompletion={billingStats?.pending_completion || 0}
                      reportIssued={billingStats?.report_issued || 0}
                      readyForBilling={billingStats?.ready_for_billing || 0}
                      billed={billingStats?.billed || 0}
                      total={(billingStats?.pending_completion || 0) + (billingStats?.report_issued || 0) + (billingStats?.ready_for_billing || 0) + (billingStats?.billed || 0)}
                    />
                    <div className="mb-4"></div>
                    <PerformanceGauge
                      percentage={
                        billingStats && (billingStats.pending_completion + billingStats.report_issued + billingStats.ready_for_billing + billingStats.billed) > 0
                          ? (billingStats.billed / (billingStats.pending_completion + billingStats.report_issued + billingStats.ready_for_billing + billingStats.billed)) * 100
                          : 0
                      }
                      label="EFICIÊNCIA DE FATURAÇÃO"
                    />
                  </>
                }
              />
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Tarefas"
                value={stats.tasks.total}
                linkTo="/tasks"
                onClick={() => setActiveSection('tasks')}
                icon="bi bi-list-check"
                color="secondary"
                details={[
                  { label: 'Concluídas', value: stats.tasks.completed, colorClass: 'bg-azure' },
                  { label: 'Por concluir', value: stats.tasks.pending, colorClass: 'bg-ruby' }
                ]}
                extra={
                  <>
                    <TaskDistributionBar
                      completed={stats.tasks.completed}
                      pending={stats.tasks.pending}
                      total={stats.tasks.total}
                    />
                    <div className="mb-4"></div>
                    <PerformanceGauge
                      percentage={stats.tasks.total > 0 ? (stats.tasks.completed / stats.tasks.total) * 100 : 0}
                      label="ÍNDICE DE PERFORMANCE"
                    />
                  </>
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="row g-4 transition-fade">
        {activeSection === 'tickets' && (
          <div className="col-12 animate__animated animate__fadeInUp">
            <div className="glass-card border-0 mb-4 overflow-hidden">
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Tickets Recentes</h5>
                <Link to="/tickets" className="btn btn-sm btn-outline-light rounded-pill px-3">Ver Todos</Link>
              </div>
              <div className="p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-uppercase small fw-bold text-muted">
                        <th className="ps-4" style={{ width: '60px' }}>ID</th>
                        <th>Estado</th>
                        <th>Assunto / Cliente</th>
                        <th>Data Criação</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                      {recentTickets.map(t => (
                        <tr key={t.id} className="shadow-sm">
                          <td className="ps-4">
                            <span className="fw-bold text-muted">#{t.id}</span>
                          </td>
                          <td>
                            {(() => {
                              let badgeClass = 'bg-info bg-opacity-15 text-info-emphasis';
                              let label = 'Desconhecido';
                              if (t.status === TicketStatus.CLOSED) { badgeClass = 'bg-success bg-opacity-15 text-success-emphasis'; label = 'Fechado'; }
                              else if (t.status === TicketStatus.OPEN) { badgeClass = 'bg-danger bg-opacity-15 text-danger-emphasis'; label = 'Aberto'; }
                              else if (t.status === TicketStatus.ACKNOWLEDGED) { badgeClass = 'bg-warning bg-opacity-15 text-warning-emphasis'; label = 'Em Análise'; }
                              else if (t.status === TicketStatus.SCHEDULED) { badgeClass = 'bg-primary bg-opacity-15 text-primary-emphasis'; label = 'Agendado'; }
                              return <span className={`badge border-0 rounded-pill px-3 ${badgeClass}`}>{label}</span>;
                            })()}
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{t.subject}</div>
                            <div className="small text-muted">{t.clientName}</div>
                          </td>
                          <td className="text-muted fw-medium">{new Date(t.date).toLocaleDateString('pt-PT')}</td>
                          <td className="text-end pe-4">
                            <Link to={`/tickets/${t.id}`} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0" style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-arrow-right-short fs-4"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'schedules' && (
          <div className="col-12 animate__animated animate__fadeInUp">
            <div className="glass-card border-0 mb-4 overflow-hidden">
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Lista de Agendamentos ({weeklySchedules.length})</h5>
                <Link to="/calendar" className="btn btn-sm btn-outline-light rounded-pill px-3">Ir para Calendário</Link>
              </div>
              <div className="p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-uppercase small fw-bold text-muted">
                        <th className="ps-4">Estado</th>
                        <th>Data / Hora</th>
                        <th>Cliente / Serviço / Equipamento</th>
                        <th>Técnico(s)</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                      {weeklySchedules.map(s => (
                        <tr key={s.id} className="shadow-sm">
                          <td className="ps-4">
                            {(() => {
                              if (s.hasReport) return <span className="badge border-0 rounded-pill px-3 bg-success bg-opacity-15 text-success-emphasis">Fechado</span>;
                              if (s.isCompleted) return <span className="badge border-0 rounded-pill px-3 bg-primary bg-opacity-15 text-primary-emphasis">Concluído</span>;
                              if (s.endDate && new Date(s.endDate) < new Date()) return <span className="badge border-0 rounded-pill px-3 bg-danger bg-opacity-15 text-danger-emphasis">Por fechar</span>;
                              return <span className="badge border-0 rounded-pill px-3 bg-secondary bg-opacity-15 text-secondary-emphasis">Pendente</span>;
                            })()}
                          </td>
                          <td>
                            <div className="fw-bold text-dark">
                              {s.startDate ? new Date(s.startDate).toLocaleDateString('pt-PT') : 'N/A'}
                            </div>
                            <div className="small text-muted">
                              {s.startDate ? new Date(s.startDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{s.clientName}</div>
                            <div className="small text-muted">
                              {formatServiceType(s.serviceType)}
                              {formatServiceType(s.serviceType) && s.equipmentModel ? ' - ' : ''}
                              {s.equipmentModel || ''}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {s.technicians.map((name, idx) => (
                                <span key={idx} className="badge bg-light text-dark border-0 shadow-none px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <Link to="/calendar" state={{ scheduleToEditId: s.id }} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0" style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-arrow-right-short fs-4"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'reports' && (
          <div className="col-12 animate__animated animate__fadeInUp">
            <div className="glass-card border-0 mb-4 overflow-hidden">
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Relatórios Pendentes ({pendingReports.length})</h5>
              </div>
              <div className="p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-uppercase small fw-bold text-muted">
                        <th className="ps-4">Estado</th>
                        <th>Data</th>
                        <th>Cliente / Serviço / Equipamento</th>
                        <th>Técnico(s)</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                      {pendingReports.map(s => (
                        <tr key={s.id} className="shadow-sm">
                          <td className="ps-4">
                            {s.hasReport ? (
                              <span className="badge border-0 rounded-pill px-3 bg-success bg-opacity-15 text-success-emphasis">Com relatório</span>
                            ) : s.isCompleted ? (
                              <span className="badge border-0 rounded-pill px-3 bg-primary bg-opacity-15 text-primary-emphasis">Concluído</span>
                            ) : s.endDate && new Date(s.endDate) < new Date() ? (
                              <span className="badge border-0 rounded-pill px-3 bg-danger bg-opacity-15 text-danger-emphasis">Por fechar</span>
                            ) : (
                              <span className="badge border-0 rounded-pill px-3 bg-secondary bg-opacity-15 text-secondary-emphasis">Pendente</span>
                            )}
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{s.endDate ? new Date(s.endDate).toLocaleDateString('pt-PT') : 'N/A'}</div>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{s.clientName}</div>
                            <div className="small text-muted">
                              {formatServiceType(s.serviceType)}
                              {formatServiceType(s.serviceType) && s.equipmentModel ? ' - ' : ''}
                              {s.equipmentModel || ''}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {s.technicians.map((name, idx) => (
                                <span key={idx} className="badge bg-light text-dark border-0 px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <Link to="/calendar" state={{ scheduleToEditId: s.id }} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0" style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-arrow-right-short fs-4"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'billing' && (
          <div className="col-12 animate__animated animate__fadeInUp">
            <div className="glass-card border-0 mb-4 overflow-hidden">
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Tarefas de Faturação ({billingTasks.length})</h5>
              </div>
              <div className="p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-uppercase small fw-bold text-muted">
                        <th className="ps-4">Nº Rel.</th>
                        <th>Estado</th>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                      {billingTasks.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4 text-muted">Nenhuma tarefa encontrada.</td></tr>
                      ) : (
                        billingTasks.map(task => (
                          <tr key={task.id} className="shadow-sm">
                            <td className="ps-4">
                              <Link to={`/report/print/${task.report_id}`} target="_blank" className="text-decoration-none fw-bold text-primary">
                                {(task as any).reports?.report_number || `#${task.report_id}`}
                              </Link>
                            </td>
                            <td>
                              {task.status === BillingStatus.PENDING_COMPLETION && <span className="badge border-0 rounded-pill px-3 bg-info bg-opacity-15 text-info-emphasis">Pendente Finalização</span>}
                              {task.status === BillingStatus.REPORT_ISSUED && <span className="badge border-0 rounded-pill px-3 bg-secondary bg-opacity-15 text-secondary-emphasis">Relatório Emitido</span>}
                              {task.status === BillingStatus.READY_FOR_BILLING && <span className="badge border-0 rounded-pill px-3 bg-warning bg-opacity-15 text-warning-emphasis">Pronto para Faturação</span>}
                              {task.status === BillingStatus.BILLED && <span className="badge border-0 rounded-pill px-3 bg-success bg-opacity-15 text-success-emphasis">Faturado</span>}
                            </td>
                            <td className="text-muted fw-medium">
                              {new Date((task as any).reports?.serviceDate || task.created_at).toLocaleDateString('pt-PT')}
                            </td>
                            <td className="fw-bold text-dark">
                              {(() => {
                                const report = Array.isArray((task as any).reports) ? (task as any).reports[0] : (task as any).reports;
                                const reportClient = report?.clients?.name || report?.clientName;
                                return reportClient || (task as any).clientName || (task as any).client_name || 'Cliente';
                              })()}
                            </td>
                            <td>
                              <div className="text-truncate small text-muted" style={{ maxWidth: '250px' }} title={task.billing_notes}>
                                {task.billing_notes || '-'}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tasks' && (
          <div className="col-12 animate__animated animate__fadeInUp">
            <div className="glass-card border-0 mb-4 overflow-hidden">
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Lista de Tarefas ({dashboardTasks.length})</h5>
                <Link to="/tasks" className="btn btn-sm btn-outline-light rounded-pill px-3">Gestão de Tarefas</Link>
              </div>
              <div className="p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-uppercase small fw-bold text-muted">
                        <th className="ps-4">Estado</th>
                        <th>Tarefa / Prioridade</th>
                        <th>Cliente / Equipamento</th>
                        <th>Data</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: 'none' }}>
                      {dashboardTasks.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4 text-muted">Nenhuma tarefa encontrada neste período.</td></tr>
                      ) : (
                        dashboardTasks.map((task: any) => (
                          <tr key={task.id} className="shadow-sm">
                            <td className="ps-4">
                              <span className={`badge border-0 rounded-pill px-3 ${task.completed ? 'bg-success bg-opacity-15 text-success-emphasis' : 'bg-warning bg-opacity-15 text-warning-emphasis'}`}>
                                {task.completed ? 'Concluída' : 'Pendente'}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{task.title}</div>
                              <div className="small text-muted">{task.priority || 'Normal'}</div>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">
                                {task.clients?.name || task.clientName || '-'}
                              </div>
                              <div className="small text-muted">
                                {task.equipments?.model || (task.equipmentInfo || '-')}
                              </div>
                            </td>
                            <td className="text-muted fw-medium">
                              {task.created_at ? new Date(task.created_at).toLocaleDateString('pt-PT') : '-'}
                            </td>
                            <td className="text-end pe-4">
                              <Link to="/tasks" state={{ taskToEditId: task.id }} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0" style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-arrow-right-short fs-4"></i>
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
