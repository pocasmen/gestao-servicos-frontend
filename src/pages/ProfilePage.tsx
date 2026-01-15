import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import { AuthContext } from '../App';
import { AppUser } from './TechniciansPage';
import SignaturePad from '../components/SignaturePad';

const ProfilePage: React.FC = () => {
    const { user: authUser } = useContext(AuthContext);
    const [user, setUser] = useState<AppUser | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [color, setColor] = useState('#3174ad');
    const [telegramchatid, setTelegramchatid] = useState('');
    const [signature, setSignature] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [botUsername, setBotUsername] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');

    useEffect(() => {
        apiClient.get('/api/telegram/bot-info').then(res => {
            setBotUsername(res.data.username);
        }).catch(err => console.error("Erro ao obter info do bot:", err));
    }, []);

    const fetchUserProfile = () => {
        if (!authUser) return;
        apiClient.get('/api/technicians').then(response => {
            const currentUser = response.data.find((u: any) => u.id === authUser.id);
            if (currentUser) {
                setUser(currentUser);
                setFirstName(currentUser.first_name || '');
                setLastName(currentUser.last_name || '');
                setColor(currentUser.color || '#3174ad');
                setTelegramchatid(currentUser.telegramchatid || '');
                setSignature(currentUser.signature || '');
            }
        }).catch(err => {
            console.error("Erro ao carregar perfil:", err);
            setErrorMessage("Erro ao carregar os dados do perfil.");
        });
    };

    useEffect(() => {
        fetchUserProfile();
    }, [authUser]);

    const handleSyncTelegram = () => {
        setIsSyncing(true);
        setSyncStatus('A verificar atualizações...');

        apiClient.post('/api/admin/sync-telegram-updates')
            .then((res) => {
                if (res.data.success) {
                    fetchUserProfile();
                    setSyncStatus('✅ Sincronização concluída!');
                } else {
                    setSyncStatus('Erro na sincronização.');
                }
            })
            .catch(() => setSyncStatus('Erro ao contactar o servidor.'))
            .finally(() => setIsSyncing(false));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!user) return;

        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            color,
            telegramchatid,
            signature
        };

        apiClient.put(`/api/technicians/${user.id}`, updatedData)
            .then(() => {
                setSuccessMessage('Perfil atualizado com sucesso!');
                setTimeout(() => setSuccessMessage(''), 3000);
            })
            .catch((err: any) => {
                console.error("Erro ao atualizar o perfil:", err);
                setErrorMessage(err.response?.data?.error || 'Ocorreu um erro ao atualizar.');
            });
    };

    if (!user) return <div className="container mt-4">A carregar perfil...</div>;

    return (
        <div className="container mt-4" style={{ maxWidth: '800px' }}>
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">O Meu Perfil</h4>
                </div>
                <div className="card-body">
                    {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
                    {successMessage && <div className="alert alert-success">{successMessage}</div>}

                    <form onSubmit={handleSave}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control bg-light" value={user.email} disabled readOnly />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Função</label>
                                <input type="text" className="form-control bg-light" value={
                                    user.role === 'super_admin' ? 'Super Administrador' :
                                        user.role === 'admin' ? 'Administrador' :
                                            user.role === 'office_staff' ? 'Administrativo' :
                                                'Técnico'
                                } disabled readOnly />
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
                            <label className="form-label">Cor no Calendário</label>
                            <div className="d-flex align-items-center">
                                <input type="color" className="form-control form-control-color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '60px' }} />
                                <span className="ms-2 text-muted small">Esta cor será usada para os seus serviços no calendário.</span>
                            </div>
                        </div>

                        <hr />

                        <h5 className="mb-3">Sincronização Telegram</h5>
                        <div className="row align-items-center">
                            <div className="col-md-7">
                                <p className="text-muted small">
                                    Para receber notificações de novos agendamentos no Telegram, siga estes passos:<br />
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
                            <p className="text-muted small">Esta assinatura será incluída automaticamente nos seus relatórios de serviço.</p>
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

export default ProfilePage;
