import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/my-schedules');
        setSchedules(response.data);
        setError('');
      } catch (err) {
        setError('Ocorreu um erro ao carregar os agendamentos.');
        console.error('Erro ao carregar agendamentos:', JSON.stringify(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return <div>A carregar agendamentos...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <h3 className="mb-4">Meus Agendamentos</h3>
      {schedules.length === 0 ? (
        <p>Não existem agendamentos para mostrar.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Data de Início</th>
                <th>Data de Fim</th>
                <th>Serviço</th>
                <th>Equipamento</th>
                <th>Técnico(s)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{format(new Date(schedule.startDate), 'dd/MM/yyyy HH:mm')}</td>
                  <td>{format(new Date(schedule.endDate), 'dd/MM/yyyy HH:mm')}</td>
                  <td>{schedule.title}</td>
                  <td>{schedule.equipmentInfo}</td>
                  <td>{schedule.technicians.join(', ') || 'N/A'}</td>
                  <td>
                    {schedule.isCompleted ? (
                      <span className="badge bg-success">Concluído</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientSchedulesListPage;
