import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { AppUser } from '../pages/TechniciansPage'; // Import the new generic interface
import GoogleColorPicker from './GoogleColorPicker';
import { useConfirm } from '../contexts/ConfirmContext';
import { UserRole } from '../constants/enums';
import { Trash2, Save, Plus, UserX, UserCheck } from 'lucide-react';
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
  const [clientRole, setClientRole] = useState('');
  const [telegramchatid, setTelegramchatid] = useState('');
  const [googleCalendarColorId, setGoogleCalendarColorId] = useState('9');
  const [errorMessage, setErrorMessage] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [dropdownClientId, setDropdownClientId] = useState<string>('');
  const { confirm, alert } = useConfirm();

  useEffect(() => {
    apiClient.get('/api/telegram/bot-info').then(res => {
      setBotUsername(res.data.username);
    }).catch(err => logger.error(err, "Erro ao obter info do bot:"));

    apiClient.get('/api/clients').then(res => {
      setAllClients(res.data);
    }).catch(err => logger.error(err, "Erro ao obter lista de clientes:"));
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setColor(user.color || '#3174ad');
      setRole(user.role || UserRole.TECHNICIAN);
      setClientRole(user.client_role || '');
      setTelegramchatid(user.telegramchatid || '');
      setGoogleCalendarColorId(user.google_calendar_color_id || '9');
      setSelectedClientIds(user.client_users?.map(cu => cu.client_id) || []);
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
          apiClient.get('/api/technicians').then(response => {
            const updatedUser = response.data.find((u: any) => u.id === user.id);
            if (updatedUser && updatedUser.telegramchatid) {
              setTelegramchatid(updatedUser.telegramchatid);
              setSyncStatus('✅ Associado com sucesso!');
              onUserUpdated();
            } else {
              setSyncStatus(`Concluído. ${res.data.count > 0 ? 'Associações encontradas.' : 'Nenhuma associação nova.'}`);
            }
          });
        } else {
          setSyncStatus('Erro na sincronização.');
        }
      })
      .catch(() => setSyncStatus('Erro ao contactar o servidor.'))
      .finally(() => setIsSyncing(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const updatedData = {
      first_name: firstName,
      last_name: lastName,
      color,
      role,
      client_role: role === UserRole.CLIENT ? clientRole : undefined,
      telegramchatid,
      google_calendar_color_id: googleCalendarColorId,
      client_ids: role === UserRole.CLIENT ? selectedClientIds : undefined
    };

    setIsSubmitting(true);
    apiClient.put(`/api/technicians/${user?.id}`, updatedData)
      .then(() => {
        onUserUpdated();
        onClose();
      })
      .catch((err: any) => {
        logger.error(err, "Erro ao atualizar o utilizador:");
        setErrorMessage(err.response?.data?.error || 'Ocorreu um erro.');
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = async () => {
    if (await confirm({
      message: 'Tem a certeza que deseja inativar este utilizador? O seu acesso será bloqueado, mas todo o seu histórico de serviços e registos será preservado.',
      title: 'Inativar Utilizador',
      variant: 'warning',
      confirmText: 'Inativar'
    })) {
      setIsSubmitting(true);
      apiClient.delete(`/api/technicians/${user?.id}`)
        .then(() => {
          onUserDeleted();
          onClose();
        })
        .catch(async (err: any) => {
          logger.error(err, "Erro ao inativar o utilizador:");
          setErrorMessage(err.response?.data?.error || 'Ocorreu um erro ao inativar.');
          await alert(err.response?.data?.error || 'Ocorreu um erro ao inativar.');
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handlePermanentDelete = async () => {
    if (await confirm({
      message: 'Tem a certeza que deseja eliminar permanentemente este utilizador? O registo será apagado da base de dados e do sistema de autenticação, libertando o email. Esta ação só é permitida se o utilizador não possuir histórico (relatórios, tickets, etc.).',
      title: 'Eliminar Permanentemente',
      variant: 'danger',
      confirmText: 'Eliminar Definitivamente'
    })) {
      setIsSubmitting(true);
      apiClient.delete(`/api/technicians/${user?.id}/permanent`)
        .then(async (res) => {
          await alert(res.data?.message || 'Utilizador eliminado com sucesso.', 'Sucesso');
          onUserDeleted();
          onClose();
        })
        .catch(async (err: any) => {
          logger.error(err, "Erro ao eliminar permanentemente o utilizador:");
          const msg = err.response?.data?.error || 'Não foi possível eliminar o utilizador.';
          setErrorMessage(msg);
          await alert(msg, 'Aviso');
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleResendInvite = async () => {
    if (await confirm({
      message: `Deseja reenviar o convite de ativação para ${user?.email}? Um novo link será gerado e enviado por email.`,
      title: 'Reenviar Convite',
      variant: 'primary',
      confirmText: 'Reenviar'
    })) {
      setIsSubmitting(true);
      apiClient.post(`/api/auth/admin/resend-invite/${user?.id}`)
        .then(async (res) => {
          await alert(res.data.message, 'Sucesso');
        })
        .catch(async (err: any) => {
          logger.error(err, "Erro ao reenviar convite:");
          const msg = err.response?.data?.error || 'Erro ao reenviar convite.';
          await alert(msg, 'Erro');
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleReactivate = async () => {
    if (await confirm({
      message: `Tem a certeza que deseja reativar a conta de ${firstName} ${lastName}? O seu acesso e capacidade de login serão restaurados.`,
      title: 'Reativar Utilizador',
      variant: 'primary',
      confirmText: 'Reativar'
    })) {
      setIsSubmitting(true);
      apiClient.post(`/api/technicians/${user?.id}/reactivate`)
        .then(async (res) => {
          await alert(res.data?.message || 'Utilizador reativado com sucesso.', 'Sucesso');
          onUserUpdated();
          onClose();
        })
        .catch(async (err: any) => {
          logger.error(err, "Erro ao reativar o utilizador:");
          const msg = err.response?.data?.error || 'Erro ao reativar o utilizador.';
          setErrorMessage(msg);
          await alert(msg, 'Erro');
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const isInactive = role === UserRole.INACTIVE_CLIENT || role === UserRole.INACTIVE_TECHNICIAN || (user?.role as any) === 'inactive_client' || (user?.role as any) === 'inactive_technician';
  const isStaff = role === UserRole.TECHNICIAN || role === UserRole.INACTIVE_TECHNICIAN || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.OFFICE_STAFF;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn animate__faster w-100" style={{ maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2" style={{ fontFamily: 'var(--font-family-title)' }}>
               {isStaff ? 'Perfil da Equipa' : 'Gestão de Utilizador'} : {firstName} {lastName}
               {isInactive && (
                 <span className="badge bg-danger rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>Inativo</span>
               )}
            </h5>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4" style={{ overflowY: 'auto' }}>
            {isInactive && (
              <div className="alert alert-warning border-0 shadow-sm rounded-4 small fw-bold mb-4 d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-person-x-fill text-danger me-2 fs-6"></i>
                  Este utilizador encontra-se <strong>inativo</strong> (acesso e login suspensos).
                </div>
                {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center gap-1"
                    onClick={handleReactivate}
                    disabled={isSubmitting}
                  >
                    <UserCheck size={16} /> Reativar
                  </button>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="alert alert-danger border-0 shadow-sm rounded-4 small fw-bold mb-4">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {errorMessage}
              </div>
            )}

            <div className="row g-4">
              <div className="col-md-6">
                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Identificação (Email)</label>
                  <input type="email" className="form-control rounded-pill bg-light border-0 px-3 fw-medium text-muted" value={user.email} disabled readOnly />
                  <div className="form-text x-small opacity-75 mt-1 ms-2 mb-3">O email é o identificador único e não pode ser alterado.</div>
                  
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Estado da Conta</label>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                      {isInactive ? (
                        <div className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill d-flex align-items-center px-3 py-2 shadow-sm">
                          <i className="bi bi-person-x-fill me-2 fs-6"></i> Inativo
                        </div>
                      ) : null}
                      <div className="badge bg-light text-dark border rounded-pill d-flex align-items-center px-3 py-2 shadow-sm">
                        {user.has_password ? (
                          <><i className="bi bi-check-circle-fill text-success me-2 fs-6"></i> Password Definida</>
                        ) : (
                          <><i className="bi bi-x-circle-fill text-danger me-2 fs-6"></i> Aguarda Password</>
                        )}
                      </div>
                      <div className="badge bg-light text-dark border rounded-pill d-flex align-items-center px-3 py-2 shadow-sm">
                        {user.is_profile_complete ? (
                          <><i className="bi bi-check-circle-fill text-success me-2 fs-6"></i> Perfil Completo</>
                        ) : (
                          <><i className="bi bi-exclamation-circle-fill text-warning me-2 fs-6"></i> Perfil Incompleto</>
                        )}
                      </div>
                      <div className="badge bg-light text-dark border rounded-pill d-flex align-items-center px-3 py-2 shadow-sm">
                        {user.has_signature ? (
                          <><i className="bi bi-check-circle-fill text-success me-2 fs-6"></i> Com Assinatura</>
                        ) : (
                          <><i className="bi bi-x-circle-fill text-secondary opacity-50 me-2 fs-6"></i> Sem Assinatura</>
                        )}
                      </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Primeiro Nome</label>
                    <input type="text" className="form-control rounded-pill px-3 shadow-none border bg-white" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Último Nome</label>
                    <input type="text" className="form-control rounded-pill px-3 shadow-none border bg-white" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>
                    {isStaff ? 'Função / Acesso' : 'Cargo na Empresa'}
                  </label>
                  {isStaff ? (
                  <select className="form-select rounded-pill px-3 shadow-none border bg-white" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                    <option value={UserRole.CLIENT}>Cliente / Utilizador Final</option>
                    <option value={UserRole.TECHNICIAN}>Técnico</option>
                    <option value={UserRole.OFFICE_STAFF}>Administrativo</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    {currentUserRole === UserRole.SUPER_ADMIN && (
                      <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    )}
                    <option value={UserRole.INACTIVE_TECHNICIAN}>Inativo</option>
                  </select>
                  ) : (
                  <select className="form-select rounded-pill px-3 shadow-none border bg-white" value={clientRole} onChange={e => setClientRole(e.target.value)}>
                    <option value="">Selecione o cargo...</option>
                    <option value="Operador">Operador</option>
                    <option value="Responsável Qualidade">Responsável Qualidade</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Responsável Compras">Responsável Compras</option>
                  </select>
                  )}
                </div>

                {isStaff && (
                  <div className="row g-3 mb-4 animate__animated animate__fadeIn">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Cor Interna</label>
                      <div className="d-flex gap-2 align-items-center">
                        <input type="color" className="form-control form-control-color rounded-circle border-0 p-0" style={{ width: '38px', height: '38px', cursor: 'pointer' }} value={color} onChange={e => setColor(e.target.value)} />
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
                )}
              </div>

              <div className="col-md-6 border-start ps-md-4">
                {isStaff ? (
                  <div className="animate__animated animate__fadeIn">
                    <div className="mb-4">
                      <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Notificações Telegram</label>
                      <div className="input-group shadow-sm rounded-pill overflow-hidden border">
                        <span className="input-group-text bg-light border-0"><i className="bi bi-send text-primary"></i></span>
                        <input
                          type="text"
                          className="form-control border-0 px-3"
                          placeholder="Chat ID (ex: 12345678)"
                          value={telegramchatid}
                          onChange={e => setTelegramchatid(e.target.value)}
                        />
                      </div>
                    </div>

                    {botUsername && user && (
                      <div className="bg-light rounded-4 p-4 border border-dashed text-center shadow-inner">
                        <h6 className="fw-bold small text-uppercase text-primary mb-3" style={{ letterSpacing: '0.05em' }}>Associação de Bot</h6>
                        <div className="bg-white p-3 d-inline-block rounded-4 border shadow-sm mb-4">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`https://t.me/${botUsername}?start=${user.id}`)}`}
                            alt="QR Code Telegram"
                          />
                        </div>
                        <div className="d-flex flex-column gap-2">
                          <button
                            type="button"
                            className={`btn btn-sm rounded-pill fw-bold ${telegramchatid ? 'btn-success' : 'btn-primary'} shadow-sm py-2`}
                            onClick={handleSyncTelegram}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <><span className="spinner-border spinner-border-sm me-2"></span> Sincronizando...</>
                            ) : (
                              telegramchatid ? 'Validar Novamente' : 'Verificar Associação'
                            )}
                          </button>
                          <a href={`https://t.me/${botUsername}?start=${user.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary rounded-pill fw-bold py-2">
                            <i className="bi bi-telegram me-2"></i> Abrir no Telegram
                          </a>
                        </div>
                        {syncStatus && <div className="mt-3 small fw-bold text-success animate__animated animate__pulse">{syncStatus}</div>}
                      </div>
                    )}
                  </div>
                ) : (
                   <div className="animate__animated animate__fadeIn">
                      <h6 className="fw-bold small text-uppercase text-muted mb-3" style={{ letterSpacing: '0.05em', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Empresas Associadas</h6>
                      
                      <div className="d-flex mb-3 gap-2">
                        <select 
                          className="form-select rounded-pill px-3 shadow-none border bg-white" 
                          value={dropdownClientId}
                          onChange={(e) => setDropdownClientId(e.target.value)}
                        >
                          <option value="" disabled>Adicionar empresa...</option>
                          {allClients
                            .filter(c => !selectedClientIds.includes(Number(c.id)))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))
                          }
                        </select>
                        <button 
                          type="button" 
                          className="btn btn-outline-primary rounded-pill px-3 fw-bold d-flex align-items-center"
                          onClick={() => {
                            if (dropdownClientId) {
                              const idNum = Number(dropdownClientId);
                              if (!isNaN(idNum) && !selectedClientIds.includes(idNum)) {
                                setSelectedClientIds(prev => [...prev, idNum]);
                              }
                              setDropdownClientId('');
                            }
                          }}
                          disabled={!dropdownClientId}
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <div className="list-group list-group-flush rounded-4 overflow-hidden border shadow-sm">
                        {selectedClientIds.length === 0 ? (
                          <div className="list-group-item text-center py-4 bg-light text-muted small fst-italic">
                            Nenhuma empresa associada. O utilizador não terá acesso.
                          </div>
                        ) : (
                          selectedClientIds.map(id => {
                            const client = allClients.find(c => Number(c.id) === id);
                            return (
                              <div key={id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 hover-bg-light">
                                <span className="fw-medium small">{client?.name || `Empresa ID ${id}`}</span>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-link text-danger p-1"
                                  onClick={() => setSelectedClientIds(prev => prev.filter(cid => cid !== id))}
                                  title="Remover Associação"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      <div className="mt-4 p-3 bg-light rounded-4 small text-muted border">
                        <i className="bi bi-info-circle me-2"></i>
                        Os utilizadores do portal podem estar associados a múltiplas empresas para alternar entre elas durante a visualização de tickets e equipamentos.
                      </div>
                   </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-light bg-opacity-50 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              {isInactive ? (
                (currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN) && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold border-0 d-flex align-items-center gap-1 shadow-none" 
                    onClick={handleReactivate}
                    disabled={isSubmitting}
                    title="Reativa o acesso deste utilizador"
                  >
                    <UserCheck size={16} /> Reativar
                  </button>
                )
              ) : (
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold border-0 d-flex align-items-center gap-1 shadow-none" 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  title="Inativa o acesso preservando o histórico de registos"
                >
                  <UserX size={16} /> Inativar
                </button>
              )}

              {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN) && (
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold border-0 d-flex align-items-center gap-1 shadow-none" 
                  onClick={handlePermanentDelete}
                  disabled={isSubmitting}
                  title="Elimina permanentemente da base de dados e auth (apenas utilizadores sem histórico)"
                >
                  <Trash2 size={16} /> Eliminar Definitivamente
                </button>
              )}
            </div>
            
            <div className="d-flex gap-2">
              {user.has_password === false && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold shadow-sm"
                  onClick={handleResendInvite}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-envelope-paper-fill me-1"></i> Reenviar Convite
                </button>
              )}
              {role === UserRole.CLIENT && currentUserRole === UserRole.SUPER_ADMIN && (
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
              <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isSubmitting}>
                {isSubmitting ? <span className="spinner-border spinner-border-sm"></span> : <Save size={18} />}
                Guardar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserDetailModal;