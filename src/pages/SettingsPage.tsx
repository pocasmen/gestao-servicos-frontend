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
  const [emailTemplates, setEmailTemplates] = useState<Record<string, any>>({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; fail: number } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/settings');
      setSettings(response.data);

      const templatesResponse = await apiClient.get('/api/admin/email-templates');
      setEmailTemplates(templatesResponse.data);
      if (Object.keys(templatesResponse.data).length > 0) {
        setSelectedTemplateKey(Object.keys(templatesResponse.data)[0]);
      }
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

  const handleTemplateChange = (field: 'subject' | 'body' | 'from', value: string) => {
    if (!selectedTemplateKey) return;
    setEmailTemplates(prev => ({
      ...prev,
      [selectedTemplateKey]: {
        ...prev[selectedTemplateKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/api/settings', settings);

      // Save templates
      await apiClient.put('/api/admin/email-templates', emailTemplates);

      setSuccess('Configurações guardadas com sucesso!');
    } catch (err) {
      console.error("Erro ao guardar configurações:", err);
      setError('Ocorreu um erro ao guardar as configurações.');
    }
  };

  const handleSyncCalendar = async () => {
    if (!window.confirm('Deseja sincronizar todos os agendamentos pendentes com o Google Calendar?')) return;

    setIsSyncing(true);
    setError('');
    setSuccess('');
    setSyncResult(null);

    try {
      const response = await apiClient.post('/api/admin/sync-google-calendar');
      setSyncResult(response.data);
      setSuccess(`Sincronização concluída: ${response.data.success} sucesso(s), ${response.data.fail} falha(s).`);
    } catch (err: any) {
      console.error("Erro na sincronização:", err);
      setError(err.response?.data?.error || 'Erro ao sincronizar com o Google Calendar.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <div className="container mt-4"><p>A carregar configurações...</p></div>;
  }

  const selectedTemplate = emailTemplates[selectedTemplateKey];

  return (
    <div className="container mt-4">
      <h2>Configurações Gerais</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card mb-4">
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

      <div className="card mb-4">
        <div className="card-header">
          Modelos de Email
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="templateSelect" className="form-label">Selecionar Template</label>
            <select
              id="templateSelect"
              className="form-select"
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
            >
              {Object.entries(emailTemplates).map(([key, tpl]: [string, any]) => (
                <option key={key} value={key}>{tpl.name || key}</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <>
              <div className="mb-3">
                <label className="form-label">Email de Origem (From)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ex: suporte@empresa.com ou 'Suporte' <suporte@empresa.com>"
                  value={selectedTemplate.from || ''}
                  onChange={(e) => handleTemplateChange('from', e.target.value)}
                />
                <div className="form-text">Se deixar vazio, será usado o valor padrão das configurações do servidor.</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Assunto</label>
                <input
                  type="text"
                  className="form-control"
                  value={selectedTemplate.subject || ''}
                  onChange={(e) => handleTemplateChange('subject', e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Corpo (HTML)</label>
                <textarea
                  className="form-control"
                  rows={10}
                  value={selectedTemplate.body || ''}
                  onChange={(e) => handleTemplateChange('body', e.target.value)}
                />
                <div className="form-text">
                  Pode usar HTML. Variáveis disponíveis: <code>{"{{login_url}}"}</code>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Pré-visualização</label>
                <div
                  style={{ border: '1px solid #ced4da', padding: '15px', borderRadius: '4px', backgroundColor: '#fff', minHeight: '150px' }}
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.body?.replace(/{{login_url}}/g, '#') || '' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card mb-4 border-primary">
        <div className="card-header bg-primary text-white">
          Sincronização com Google Calendar
        </div>
        <div className="card-body">
          <p>Esta ação irá sincronizar todos os agendamentos existentes que ainda não foram enviados para o Google Calendar.</p>
          <button
            className="btn btn-outline-primary"
            onClick={handleSyncCalendar}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                A sincronizar...
              </>
            ) : 'Sincronizar Todos os Agendamentos'}
          </button>

          {syncResult && (
            <div className="mt-2 text-muted small">
              Último resultado: {syncResult.success} sincronizados, {syncResult.fail} falhas.
            </div>
          )}
        </div>
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={handleSave}>
          Guardar Todas as Alterações
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
