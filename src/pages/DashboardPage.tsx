import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

interface DashboardStats {
  openTickets: number;
  weeklySchedules: number;
  pendingReports: number;
}

interface ScheduleDetail {
  id: number;
  title: string;
  startDate?: string;
  endDate?: string;
  clientName: string;
  technicians: string[];
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<ScheduleDetail[]>([]);
  const [pendingReports, setPendingReports] = useState<ScheduleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, schedulesRes, reportsRes] = await Promise.all([
          apiClient.get('/api/dashboard/stats'),
          apiClient.get('/api/dashboard/weekly-schedules'),
          apiClient.get('/api/dashboard/pending-reports')
        ]);
        setStats(statsRes.data);
        setWeeklySchedules(schedulesRes.data);
        setPendingReports(reportsRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="container mt-4">A carregar...</div>;
  }

  if (error) {
    return <div className="container mt-4 alert alert-danger">{error}</div>;
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="display-4 fw-bold mb-0">Dashboard</h1>
          <p className="text-muted">Bem-vindo ao centro de operações.</p>
        </div>
      </div>

      <div className="row g-4 mb-5">
        {stats && (
          <>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Tickets Pendentes"
                value={stats.openTickets}
                linkTo="/tickets"
                icon="bi bi-ticket-perforated"
                color="primary"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Agendamentos Semanais"
                value={stats.weeklySchedules}
                linkTo="/calendar"
                icon="bi bi-calendar-week"
                color="warning"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-4">
              <StatCard
                title="Relatórios Pendentes"
                value={stats.pendingReports}
                linkTo="/reports"
                icon="bi bi-file-earmark-text"
                color="danger"
              />
            </div>
          </>
        )}
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h3 className="h5 fw-bold mb-4">Agendamentos Semanais ({weeklySchedules.length})</h3>
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Técnico(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedules.map(s => (
                    <tr key={s.id}>
                      <td><Link to="/calendar" state={{ scheduleToEditId: s.id }} className="fw-bold text-decoration-none">#{s.id}</Link></td>
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
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h3 className="h5 fw-bold mb-4">Relatórios Pendentes ({pendingReports.length})</h3>
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID Agend.</th>
                    <th>Data Fim</th>
                    <th>Cliente</th>
                    <th>Técnico(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReports.map(s => (
                    <tr key={s.id}>
                      <td><Link to="/calendar" state={{ scheduleToEditId: s.id }} className="fw-bold text-decoration-none">#{s.id}</Link></td>
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
      </div>
    </div>
  );
};

export default DashboardPage;
