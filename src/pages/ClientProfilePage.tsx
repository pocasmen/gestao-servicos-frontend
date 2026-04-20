import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import { AuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import SignaturePad from '../components/SignaturePad';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

// Define interface locally to avoid dependency on TechniciansPage (which is admin-facing)
interface NotificationPrefs {
    [key: string]: {
        email: boolean;
        telegram: boolean;
    };
}

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    client_role?: string;
    color?: string;
    telegramchatid?: string;
    signature?: string;
    daily_notifications_enabled?: boolean;
    notification_time?: string;
    phone?: string;
    notification_prefs?: NotificationPrefs;
}

const ClientProfilePage: React.FC = () => {
    const { user: authUser } = useContext(AuthContext);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [clientRole, setClientRole] = useState('');
    const [telegramchatid, setTelegramchatid] = useState('');
    const [phone, setPhone] = useState('');
    const [signature, setSignature] = useState('');
    const [botUsername, setBotUsername] = useState('');
    const { alert } = useConfirm();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
        new_schedule: { email: true, telegram: false },
        new_report: { email: true, telegram: false },
        ticket_reply: { email: true, telegram: false },
        docs_uploaded: { email: true, telegram: false }
    });

    useEffect(() => {
        apiClient.get('/api/telegram/bot-info').then(res => {
            setBotUsername(res.data.username);
        }).catch(err => logger.error(err, "Erro ao obter info do bot:"));
    }, []);

    const fetchUserProfile = () => {
    apiClient.get('/api/technicians/me').then(response => {
            const currentUser = response.data;
            if (currentUser) {
                setUser(currentUser);
                setFirstName(currentUser.first_name || '');
                setLastName(currentUser.last_name || '');
                setClientRole(currentUser.client_role || '');
                setTelegramchatid(currentUser.telegramchatid || '');
                setPhone(currentUser.phone || '');
                setSignature(currentUser.signature || '');
                if (currentUser.notification_prefs) {
                    setNotificationPrefs(currentUser.notification_prefs);
                }
            }
        }).catch(err => {
            logger.error(err, "Erro ao carregar perfil:");
            alert("Erro ao carregar os dados do perfil.");
        });
    };

    useEffect(() => {
        if (authUser) {
            fetchUserProfile();
        }
    }, [authUser]);

    const handleSyncTelegram = () => {
        setIsSyncing(true);
        setSyncStatus('A verificar atualizações...');

        apiClient.post('/api/telegram/sync-updates')
            .then((res) => {
                if (res.data.success) {
                    fetchUserProfile();
                    setSyncStatus('✅ Sincronização concluída!');
                } else {
                    setSyncStatus('Erro na sincronização.');
                }
            })
            .catch(() => {
                setSyncStatus('');
                alert('Erro ao contactar o servidor.');
            })
            .finally(() => setIsSyncing(false));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        if (!firstName.trim() || !lastName.trim() || !clientRole.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios (Nome, Apelido e Função).');
            return;
        }

        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            client_role: clientRole,
            telegramchatid,
            signature,
            phone,
            notification_prefs: notificationPrefs
        };

        apiClient.put(`/api/technicians/${user.id}`, updatedData)
            .then(async () => {
                // Sincronizar a sessão local do Supabase para refletir os novos metadados salvos no backend
                await supabase.auth.refreshSession();
                alert('Perfil atualizado com sucesso!');
            })
            .catch((err: any) => {
                logger.error(err, "Erro ao atualizar o perfil:");
                alert(err.response?.data?.error || 'Ocorreu um erro ao atualizar.');
            });
    };

    if (!user) return <div className="container-fluid mt-4">A carregar perfil...</div>;

    const handleTogglePreference = (eventKey: string, channel: 'email' | 'telegram') => {
        if (channel === 'telegram' && !telegramchatid) {
            alert('Atenção: Para ativar notificações via Telegram, deve primeiro associar a sua conta no passo acima (Sincronização Telegram).');
        }

        setNotificationPrefs(prev => ({
            ...prev,
            [eventKey]: {
                ...prev[eventKey],
                [channel]: !prev[eventKey][channel]
            }
        }));
    };

    const roleOptions = [
        "Operador",
        "Responsável Qualidade",
        "Administrador",
        "Responsável Compras"
    ];

    const notificationEvents = [
        { key: 'new_schedule', label: 'Novo Agendamento', icon: 'bi-calendar-event' },
        { key: 'new_report', label: 'Novo Relatório Técnico', icon: 'bi-file-earmark-text' },
        { key: 'ticket_reply', label: 'Resposta a Ticket (Chat)', icon: 'bi-chat-dots' },
        { key: 'docs_uploaded', label: 'Documentos Carregados', icon: 'bi-cloud-arrow-up' }
    ];

    return (
        <div className="container-fluid mt-4">
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">O Meu Perfil</h4>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control bg-light" value={user.email} disabled readOnly />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Função (Cargo na Empresa) <span className="text-danger">*</span></label>
                                <select
                                    className="form-select"
                                    value={clientRole}
                                    onChange={e => setClientRole(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione a sua função...</option>
                                    {roleOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Primeiro Nome <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Último Nome <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} required />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Telefone</label>
                            <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: 912345678" />
                        </div>

                        <hr />

                        <h5 className="mb-3">Sincronização Telegram</h5>
                        <div className="row align-items-center">
                            <div className="col-md-7">
                                <p className="text-muted small">
                                    Para receber notificações de novos tickets e agendamentos no Telegram, siga estes passos:<br />
                                    1. Clique no botão "Abrir Telegram" ou leia o QR Code.<br />
                                    2. Pressione "Começar" (ou envie /start) no chat com o bot.<br />
                                    3. Clique em "Verificar Associação" aqui.
                                </p>
                                <div className="mb-3">
                                    <label className="form-label">Chat ID do Telegram</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Pendente de associação..."
                                        value={telegramchatid}
                                        onChange={e => setTelegramchatid(e.target.value)}
                                        readOnly
                                    />
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className={`btn ${telegramchatid ? 'btn-success' : 'btn-primary'}`}
                                        onClick={handleSyncTelegram}
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? 'A verificar...' : (telegramchatid ? 'Sincronizar Novamente' : 'Verificar Associação')}
                                    </button>
                                    <a
                                        href={`https://t.me/${botUsername}?start=${user.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-primary"
                                    >
                                        Abrir Telegram
                                    </a>
                                </div>
                                {syncStatus && <div className="mt-2 fw-bold small">{syncStatus}</div>}
                            </div>
                            <div className="col-md-5 text-center">
                                {botUsername && (
                                    <div className="p-3 bg-light border rounded d-inline-block">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://t.me/${botUsername}?start=${user.id}`)}`}
                                            alt="QR Code Telegram"
                                        />
                                        <div className="mt-2 small text-muted">Scan para associar</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr />

                        <h5 className="mb-3">Preferências de Notificação</h5>
                        <p className="text-muted small mb-3">Escolha como deseja ser notificado sobre eventos importantes.</p>
                        
                        <div className="table-responsive mb-4">
                            <table className="table table-hover align-middle border">
                                <thead className="table-light">
                                    <tr>
                                        <th>Evento</th>
                                        <th className="text-center" style={{ width: '120px' }}><i className="bi bi-envelope me-1"></i> Email</th>
                                        <th className="text-center" style={{ width: '120px' }}><i className="bi bi-send me-1"></i> Telegram</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notificationEvents.map(event => (
                                        <tr key={event.key}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className={`bi ${event.icon} me-2 text-primary fs-5`}></i>
                                                    <span>{event.label}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check form-check-inline m-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={notificationPrefs[event.key]?.email || false}
                                                        onChange={() => handleTogglePreference(event.key, 'email')}
                                                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check form-check-inline m-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={notificationPrefs[event.key]?.telegram || false}
                                                        onChange={() => handleTogglePreference(event.key, 'telegram')}
                                                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <hr />

                        <div className="mb-3">
                            <label className="form-label">Minha Assinatura</label>
                            <p className="text-muted small">Esta assinatura será usada para validar documentos digitais.</p>
                            <SignaturePad
                                title="Minha Assinatura"
                                onConfirm={(dataUrl) => setSignature(dataUrl)}
                                onClear={() => setSignature('')}
                                initialSignature={signature}
                            />
                            {signature && (
                                <div className="alert alert-success mt-2 py-1 px-2 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Assinatura capturada com sucesso!
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-top text-end">
                            <button type="submit" className="btn btn-primary px-5">Guardar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClientProfilePage;
