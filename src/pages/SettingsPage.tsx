import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    ticket_notification_active: 'true',
    ticket_notification_time: '17:00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/settings');
      setSettings(response.data);
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
      setError('Não foi possível carregar as configurações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked.toString();
    }

    setSettings(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/api/settings', settings);
      setSuccess('Configurações guardadas com sucesso!');
    } catch (err) {
      console.error("Erro ao guardar configurações:", err);
      setError('Ocorreu um erro ao guardar as configurações.');
    }
  };

  if (isLoading) {
    return <div className="container mt-4"><p>A carregar configurações...</p></div>;
  }

  return (
    <div className="container mt-4">
      <h2>Configurações Gerais</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header">
          Notificações de Tickets Pendentes
        </div>
        <div className="card-body">
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="ticket_notification_active"
              name="ticket_notification_active"
              checked={settings.ticket_notification_active === 'true'}
              onChange={handleInputChange}
            />
            <label className="form-check-label" htmlFor="ticket_notification_active">
              Ativar lembrete diário por Telegram
            </label>
          </div>

          <div className="mb-3">
            <label htmlFor="ticket_notification_time" className="form-label">Hora do Lembrete</label>
            <input
              type="time"
              className="form-control"
              id="ticket_notification_time"
              name="ticket_notification_time"
              value={settings.ticket_notification_time}
              onChange={handleInputChange}
              disabled={settings.ticket_notification_active !== 'true'}
            />
            <div className="form-text">A verificação será feita nos dias úteis à hora selecionada.</div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-3" onClick={handleSave}>
        Guardar Alterações
      </button>
    </div>
  );
};

export default SettingsPage;
