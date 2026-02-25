import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import { AuthContext } from '../contexts/AuthContext';
import SignaturePad from '../components/SignaturePad';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

// Define interface locally to avoid dependency on TechniciansPage (which is admin-facing)
interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    color?: string;
    telegramchatid?: string;
    signature?: string;
    daily_notifications_enabled?: boolean;
    notification_time?: string;
    phone?: string;
}

const ClientProfilePage: React.FC = () => {
    const { user: authUser } = useContext(AuthContext);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [telegramchatid, setTelegramchatid] = useState('');
    const [phone, setPhone] = useState('');
    const [signature, setSignature] = useState('');
    const [botUsername, setBotUsername] = useState('');
    const { alert } = useConfirm();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');

    useEffect(() => {
        apiClient.get('/api/telegram/bot-info').then(res => {
            setBotUsername(res.data.username);
        }).catch(err => logger.error(err, "Erro ao obter info do bot:"));
    }, []);

    const fetchUserProfile = () => {
        apiClient.get('/api/users/me').then(response => {
            const currentUser = response.data;
            if (currentUser) {
                setUser(currentUser);
                setFirstName(currentUser.first_name || '');
                setLastName(currentUser.last_name || '');
                setTelegramchatid(currentUser.telegramchatid || '');
                setPhone(currentUser.phone || '');
                setSignature(currentUser.signature || '');
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

        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            telegramchatid,
            signature,
            phone
        };

        apiClient.put(`/api/technicians/${user.id}`, updatedData)
            .then(() => {
                alert('Perfil atualizado com sucesso!');
            })
            .catch((err: any) => {
                logger.error(err, "Erro ao atualizar o perfil:");
                alert(err.response?.data?.error || 'Ocorreu um erro ao atualizar.');
            });
    };

    if (!user) return <div className="container-fluid mt-4">A carregar perfil...</div>;

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
                                <label className="form-label">Função</label>
                                <input type="text" className="form-control bg-light" value="Cliente" disabled readOnly />
                            </div>
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
