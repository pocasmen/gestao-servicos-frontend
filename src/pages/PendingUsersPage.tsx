import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { UserRole } from '../constants/enums';

// A interface para um utilizador pendente, vindo do auth
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

// A interface para um cliente (empresa)
interface Client {
    id: number;
    name: string;
}

const PendingUsersPage: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClients, setSelectedClients] = useState<{ [userId: string]: number | '' }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { alert } = useConfirm();

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            apiClient.get('/admin/pending-users'),
            apiClient.get('/api/clients')
        ]).then(([pendingUsersResponse, clientsResponse]) => {
            setPendingUsers(pendingUsersResponse.data);
            setClients(clientsResponse.data);
            setError('');
        }).catch(err => {
            console.error("Failed to fetch data:", err);
            setError("Não foi possível carregar os dados. Tente novamente mais tarde.");
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleClientSelection = (userId: string, client_id: string) => {
        setSelectedClients(prev => ({
            ...prev,
            [userId]: client_id ? Number(client_id) : ''
        }));
    };

    const handleApprove = async (userId: string) => {
        const client_id = selectedClients[userId];
        if (!client_id) {
            await alert("Por favor, selecione uma empresa cliente para associar.");
            return;
        }

        apiClient.post('/admin/approve-user', { userId, client_id })
            .then(async () => {
                await alert('Utilizador aprovado com sucesso!', 'Sucesso');
                // Refresca a lista de utilizadores pendentes
                fetchData();
            })
            .catch(async (err) => {
                console.error("Failed to approve user:", err);
                await alert(`Erro ao aprovar utilizador: ${err.response?.data?.error || 'Erro desconhecido'}`);
            });
    };

    if (loading) {
        return <div className="container mt-4">A carregar...</div>;
    }

    if (error) {
        return <div className="container mt-4 alert alert-danger">{error}</div>;
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Aprovações de Utilizadores Pendentes</h2>
            {pendingUsers.length === 0 ? (
                <p>Não há utilizadores pendentes de aprovação.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                        <thead className="table-light">
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Empresa (Sugerida)</th>
                                <th style={{ width: '30%' }}>Associar à Empresa Cliente</th>
                                <th style={{ width: '15%' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.user_metadata.first_name} {user.user_metadata.last_name}</td>
                                    <td>{user.email}</td>
                                    <td><em>{user.user_metadata.company_name}</em></td>
                                    <td>
                                        <select
                                            className="form-select"
                                            value={selectedClients[user.id] || ''}
                                            onChange={(e) => handleClientSelection(user.id, e.target.value)}
                                        >
                                            <option value="">Selecione uma empresa...</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-success w-100"
                                            onClick={() => handleApprove(user.id)}
                                            disabled={!selectedClients[user.id]}
                                        >
                                            Aprovar
                                        </button>
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

export default PendingUsersPage;
