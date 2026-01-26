import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { AppUser } from '../pages/TechniciansPage'; // Import the new generic interface
import GoogleColorPicker from './GoogleColorPicker';
import { useConfirm } from '../contexts/ConfirmContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
  currentUserRole: string;
}

// ... (interface remains)

const UserDetailModal: React.FC<ModalProps> = ({ isOpen, onClose, user, onUserUpdated, onUserDeleted, currentUserRole }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [color, setColor] = useState('#3174ad');
  const [role, setRole] = useState<'technician' | 'admin' | 'office_staff' | 'super_admin'>('technician');
  const [telegramchatid, setTelegramchatid] = useState('');
  const [googleCalendarColorId, setGoogleCalendarColorId] = useState('9');
  const [errorMessage, setErrorMessage] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const { confirm, alert } = useConfirm();

  useEffect(() => {
    apiClient.get('/api/telegram/bot-info').then(res => {
      setBotUsername(res.data.username);
    }).catch(err => console.error("Erro ao obter info do bot:", err));
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setColor(user.color || '#3174ad');
      setRole(user.role || 'technician');
      setTelegramchatid(user.telegramchatid || '');
      setGoogleCalendarColorId(user.google_calendar_color_id || '9');
      setErrorMessage('');
      setSyncStatus('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSyncTelegram = () => {
    setIsSyncing(true);
    setSyncStatus('A verificar atualizações...');

    apiClient.post('/api/admin/sync-telegram-updates')
      .then((res) => {
        if (res.data.success) {
          // Refetch user data to see the new ID if associated
          apiClient.get('/api/technicians').then(response => {
            const updatedUser = response.data.find((u: any) => u.id === user.id);
            if (updatedUser && updatedUser.telegramchatid) {
              setTelegramchatid(updatedUser.telegramchatid);
              setSyncStatus('✅ Associado com sucesso!');
              onUserUpdated();
            } else {
              setSyncStatus(`Concluído. ${res.data.count > 0 ? 'Associações encontradas.' : 'Nenhuma associação nova para este técnico.'}`);
            }
          });
        } else {
          setSyncStatus('Erro na sincronização.');
        }
      })
      .catch(() => setSyncStatus('Erro ao contactar o servidor.'))
      .finally(() => setIsSyncing(false));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedData = {
      first_name: firstName,
      last_name: lastName,
      color,
      role,
      telegramchatid,
      google_calendar_color_id: googleCalendarColorId
    };

    apiClient.put(`/api/technicians/${user?.id}`, updatedData)
      .then(() => {
        onUserUpdated();
        onClose();
      })
      .catch((err: any) => {
        console.error("Erro ao atualizar o utilizador:", err);
        setErrorMessage(err.response?.data?.error || 'Ocorreu um erro.');
      });
  };

  const handleDelete = async () => {
    if (await confirm({
      message: 'Tem a certeza que deseja eliminar este utilizador? Esta ação não pode ser desfeita e irá remover o seu acesso permanentemente.',
      title: 'Eliminar Utilizador',
      variant: 'danger',
      confirmText: 'Eliminar'
    })) {
      apiClient.delete(`/api/technicians/${user?.id}`)
        .then(() => {
          onUserDeleted();
          onClose();
        })
        .catch(async (err: any) => {
          console.error("Erro ao eliminar o utilizador:", err);
          setErrorMessage(err.response?.data?.error || 'Ocorreu um erro ao eliminar.');
          await alert(err.response?.data?.error || 'Ocorreu um erro ao eliminar.');
        });
    }
  };

  return (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSave}>
            <div className="modal-header">
              <h5 className="modal-title">Editar Utilizador</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={user.email} disabled readOnly />
                <div className="form-text">O email não pode ser alterado.</div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Primeiro Nome</label>
                  <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Último Nome</label>
                  <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 mb-3">
                  <label className="form-label">Função</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                  >
                    <option value="technician">Técnico</option>
                    <option value="office_staff">Administrativo</option>
                    <option value="admin">Admin</option>
                    {currentUserRole === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Cor Interna</label>
                  <input type="color" className="form-control form-control-color w-100" value={color} onChange={e => setColor(e.target.value)} />
                </div>
                <div className="col-md-6 mb-3">
                  <GoogleColorPicker
                    label="Cor Google Calendar"
                    value={googleCalendarColorId}
                    onChange={setGoogleCalendarColorId}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Telegram Chat ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: 12345678"
                  value={telegramchatid}
                  onChange={e => setTelegramchatid(e.target.value)}
                />
                <div className="form-text">ID necessário para notificações automáticas via Telegram.</div>
              </div>

              {botUsername && user && (
                <div className="alert alert-light border mt-3 text-center">
                  <h6 className="mb-2">Associação Automática</h6>
                  <p className="small text-muted mb-2">Peça ao técnico para ler o QR Code ou clicar no botão abaixo para associar o Telegram automaticamente.</p>
                  <div className="d-inline-block p-2 bg-white border mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://t.me/${botUsername}?start=${user.id}`)}`}
                      alt="QR Code Telegram"
                    />
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${telegramchatid ? 'btn-success' : 'btn-primary'} me-2`}
                      onClick={handleSyncTelegram}
                      disabled={isSyncing}
                    >
                      {isSyncing ? 'A verificar...' : (telegramchatid ? 'Verificar Novamente' : 'Verificar Associação')}
                    </button>
                    <a
                      href={`https://t.me/${botUsername}?start=${user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      Abrir Telegram
                    </a>
                  </div>
                  {syncStatus && <div className="small mt-2 fw-bold">{syncStatus}</div>}
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-danger me-auto" onClick={handleDelete}>Eliminar Utilizador</button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;