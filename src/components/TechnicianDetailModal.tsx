import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { AppUser } from '../pages/TechniciansPage'; // Import the new generic interface
import GoogleColorPicker from './GoogleColorPicker';
import { useConfirm } from '../contexts/ConfirmContext';
import { UserRole } from '../constants/enums';
import { Trash2 } from 'lucide-react';
import logger from '../utils/logger';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
  currentUserRole: UserRole;
}

// ... (interface remains)

const UserDetailModal: React.FC<ModalProps> = ({ isOpen, onClose, user, onUserUpdated, onUserDeleted, currentUserRole }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [color, setColor] = useState('#3174ad');
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN);
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
    }).catch(err => logger.error(err, "Erro ao obter info do bot:"));
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setColor(user.color || '#3174ad');
      setRole(user.role || UserRole.TECHNICIAN);
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

    apiClient.post('/api/telegram/sync-updates')
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
        logger.error(err, "Erro ao atualizar o utilizador:");
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
          logger.error(err, "Erro ao eliminar o utilizador:");
          setErrorMessage(err.response?.data?.error || 'Ocorreu um erro ao eliminar.');
          await alert(err.response?.data?.error || 'Ocorreu um erro ao eliminar.');
        });
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="glass-card border-0 shadow-lg w-100 overflow-hidden animate__animated animate__zoomIn animate__faster">
          <form onSubmit={handleSave}>
            <div className="modal-header bg-dark border-0 px-4 py-3 d-flex justify-content-between align-items-center">
              <h5 className="modal-title text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                Perfil: {firstName} {lastName}
              </h5>
              <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4">
              {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 small fw-bold mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> {errorMessage}
                </div>
              )}

              <div className="row g-4">
                <div className="col-md-6">
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Email</label>
                    <input type="email" className="form-control rounded-pill bg-light border-0 px-3 fw-medium text-muted" value={user.email} disabled readOnly />
                    <div className="form-text small opacity-75">O email é o identificador único e não pode ser alterado.</div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Primeiro Nome</label>
                      <input type="text" className="form-control rounded-pill px-3" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Último Nome</label>
                      <input type="text" className="form-control rounded-pill px-3" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Função / Acesso</label>
                    <select className="form-select rounded-pill px-3" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                      <option value={UserRole.TECHNICIAN}>Técnico</option>
                      <option value={UserRole.OFFICE_STAFF}>Administrativo</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                      {currentUserRole === UserRole.SUPER_ADMIN && (
                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                      )}
                    </select>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Cor Interna</label>
                      <div className="d-flex gap-2 align-items-center">
                        <input type="color" className="form-control form-control-color rounded-circle border-0 p-0" style={{ width: '38px', height: '38px' }} value={color} onChange={e => setColor(e.target.value)} />
                        <span className="small text-muted font-monospace">{color.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <GoogleColorPicker
                        label="Cor Google"
                        value={googleCalendarColorId}
                        onChange={setGoogleCalendarColorId}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-md-6 border-start ps-md-4">
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Notificações Telegram</label>
                    <div className="input-group">
                      <span className="input-group-text rounded-start-pill bg-light border-0"><i className="bi bi-send text-primary"></i></span>
                      <input
                        type="text"
                        className="form-control rounded-end-pill px-3"
                        placeholder="Chat ID (ex: 12345678)"
                        value={telegramchatid}
                        onChange={e => setTelegramchatid(e.target.value)}
                      />
                    </div>
                  </div>

                  {botUsername && user && (
                    <div className="bg-light rounded-4 p-3 border border-dashed text-center">
                      <h6 className="fw-bold small text-uppercase text-primary mb-3">Associação Automática</h6>
                      <div className="bg-white p-2 d-inline-block rounded-3 border shadow-sm mb-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://t.me/${botUsername}?start=${user.id}`)}`}
                          alt="QR Code Telegram"
                        />
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill fw-bold ${telegramchatid ? 'btn-success' : 'btn-primary'} shadow-sm`}
                          onClick={handleSyncTelegram}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span> A sincronizar...</>
                          ) : (
                            telegramchatid ? 'Re-verificar Associação' : 'Verificar Agora'
                          )}
                        </button>
                        <a href={`https://t.me/${botUsername}?start=${user.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary rounded-pill fw-bold">
                          Abrir Bot no Telegram
                        </a>
                      </div>
                      {syncStatus && <div className="mt-2 x-small fw-bold text-success animate__animated animate__pulse">{syncStatus}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light border-0 px-4 py-3 d-flex justify-content-between gap-2">
              <button type="button" className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold border-0" onClick={handleDelete}>
                <Trash2 size={16} className="me-1" /> Eliminar Utilizador
              </button>
              
              <div className="d-flex gap-2">
                {user.role === UserRole.CLIENT && currentUserRole === UserRole.SUPER_ADMIN && (
                  <button
                      type="button"
                      className="btn btn-sm btn-warning rounded-pill px-3 fw-bold shadow-sm"
                      onClick={() => {
                          onClose();
                          document.dispatchEvent(new CustomEvent('initImpersonate', { detail: user }));
                      }}
                  >
                      <i className="bi bi-person-lines-fill me-1"></i> Simular
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-light rounded-pill px-3 fw-bold border shadow-sm" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-sm btn-primary rounded-pill px-4 fw-bold shadow-sm">Guardar Alterações</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;