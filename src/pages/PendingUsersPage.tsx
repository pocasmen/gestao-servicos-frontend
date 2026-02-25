import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { Plus, Trash2 } from 'lucide-react';

interface PendingUser {
    id: string;
    email: string;
    user_metadata: {
        first_name: string;
        last_name: string;
        company_name: string;
        role: string;
    }
}

interface Client {
    id: number;
    name: string;
}

const PendingUsersPage: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    // Keep an array of selected client IDs per user
    const [selectedClients, setSelectedClients] = useState<{ [userId: string]: number[] }>({});
    const [loading, setLoading] = useState(true);
    const { alert } = useConfirm();

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            apiClient.get('/admin/pending-users'),
            apiClient.get('/api/clients')
        ]).then(([pendingUsersResponse, clientsResponse]) => {
            setPendingUsers(pendingUsersResponse.data);
            setClients(clientsResponse.data);

            // Initialize empty arrays
            const initialMap: any = {};
            pendingUsersResponse.data.forEach((u: PendingUser) => {
                initialMap[u.id] = [];
            });
            setSelectedClients(initialMap);
        }).catch(err => {
            logger.error(err, "Failed to fetch data:");
            alert("Não foi possível carregar os dados. Tente novamente mais tarde.");
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addClientToUser = (userId: string, clientId: string) => {
        if (!clientId) return;
        const id = Number(clientId);
        setSelectedClients(prev => {
            const current = prev[userId] || [];
            if (current.includes(id)) return prev;
            return {
                ...prev,
                [userId]: [...current, id]
            };
        });
    };

    const removeClientFromUser = (userId: string, clientId: number) => {
        setSelectedClients(prev => {
            const current = prev[userId] || [];
            return {
                ...prev,
                [userId]: current.filter(id => id !== clientId)
            };
        });
    };

    const handleApprove = async (userId: string) => {
        // Obter array exclusivo
        const client_ids = selectedClients[userId] || [];
        if (client_ids.length === 0) {
            await alert("Por favor, adicione pelo menos uma empresa cliente para associar.");
            return;
        }

        apiClient.post('/admin/approve-user', { userId, client_ids })
            .then(async () => {
                await alert('Utilizador aprovado com sucesso!', 'Sucesso');
                fetchData();
            })
            .catch(async (err) => {
                logger.error(err, "Failed to approve user:");
                await alert(`Erro ao aprovar utilizador: ${err.response?.data?.error || 'Erro desconhecido'}`);
            });
    };

    if (loading) {
        return <div className="container-fluid mt-4">A carregar...</div>;
    }

    return (
        <div className="container-fluid mt-4">
            <h2 className="mb-4">Aprovações de Utilizadores Pendentes</h2>
            {pendingUsers.length === 0 ? (
                <p>Não há utilizadores pendentes de aprovação.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Nome e Email</th>
                                <th>Empresa (Sugerida)</th>
                                <th style={{ width: '40%' }}>Empresas a Associar</th>
                                <th style={{ width: '15%' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(user => {
                                const selectedIds = selectedClients[user.id] || [];
                                const unselectedClients = clients.filter(c => !selectedIds.includes(c.id));

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="fw-bold">{user.user_metadata.first_name} {user.user_metadata.last_name}</div>
                                            <div className="small text-muted">{user.email}</div>
                                        </td>
                                        <td><em>{user.user_metadata.company_name}</em></td>
                                        <td>
                                            <div className="d-flex mb-2 gap-2">
                                                <select
                                                    className="form-select w-75"
                                                    id={`select-${user.id}`}
                                                >
                                                    <option value="">Selecione para adicionar...</option>
                                                    {unselectedClients.map(client => (
                                                        <option key={client.id} value={client.id}>
                                                            {client.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="btn btn-outline-primary"
                                                    onClick={() => {
                                                        const selectElem = document.getElementById(`select-${user.id}`) as HTMLSelectElement;
                                                        addClientToUser(user.id, selectElem.value);
                                                        selectElem.value = "";
                                                    }}
                                                    title="Adicionar Empresa"
                                                >
                                                    <Plus size={18} /> Associar
                                                </button>
                                            </div>

                                            {selectedIds.length > 0 && (
                                                <ul className="list-group list-group-sm">
                                                    {selectedIds.map(id => {
                                                        const cDb = clients.find(c => c.id === id);
                                                        return (
                                                            <li key={id} className="list-group-item d-flex justify-content-between align-items-center py-1">
                                                                <span className="small">{cDb?.name || `ID ${id}`}</span>
                                                                <button
                                                                    className="btn btn-sm text-danger p-1"
                                                                    onClick={() => removeClientFromUser(user.id, id)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-success w-100"
                                                onClick={() => handleApprove(user.id)}
                                                disabled={selectedIds.length === 0}
                                            >
                                                Aprovar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PendingUsersPage;
