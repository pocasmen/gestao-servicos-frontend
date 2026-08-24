import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, AlertTriangle, Users, MonitorSmartphone, Mail, Phone, MapPin, CheckCircle, XCircle, Info } from 'lucide-react';
import apiClient from '../apiClient';
import { Client, Equipment } from '../types';
import { EditClientModal } from '../components/EditClientModal';
import { AuthContext } from '../contexts/AuthContext';
import UserDetailModal from '../components/TechnicianDetailModal';
import { AppUser } from '../pages/TechniciansPage';
import { UserRole } from '../constants/enums';

export default function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useContext(AuthContext);
    const [showUsers, setShowUsers] = useState(false);
    const [showEquipments, setShowEquipments] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const { data: client, isLoading: isLoadingClient, error: clientError } = useQuery<Client>({
        queryKey: ['client', id],
        queryFn: async () => {
            const res = await apiClient.get(`/api/clients/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
        queryKey: ['client-users', id],
        queryFn: async () => {
            const res = await apiClient.get(`/api/clients/${id}/users`);
            return res.data;
        },
        enabled: !!id,
    });

    const { data: equipments = [], isLoading: isLoadingEquipments } = useQuery<Equipment[]>({
        queryKey: ['client-equipments', id],
        queryFn: async () => {
            const res = await apiClient.get(`/api/clients/${id}/equipments`);
            return res.data;
        },
        enabled: !!id,
    });

    const updateMutation = useMutation({
        mutationFn: (updatedClient: Client) => apiClient.put(`/api/clients/${updatedClient.id}`, updatedClient),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsEditModalOpen(false);
        },
        onError: (error: any) => {
            alert('Erro ao atualizar cliente: ' + (error?.response?.data?.error || 'Erro desconhecido'));
        }
    });

    if (isLoadingClient) {
        return (
            <div className="container mt-4 d-flex justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">A carregar...</span>
                </div>
            </div>
        );
    }

    if (clientError || !client) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">Erro ao carregar detalhes do cliente.</div>
            </div>
        );
    }

    return (
        <div className="container mt-4 pb-5">
            {/* Top Navigation */}
            <button
                onClick={() => navigate('/clients')}
                className="btn btn-link text-decoration-none text-muted mb-3 p-0 d-flex align-items-center gap-2"
            >
                <ArrowLeft size={18} /> Voltar à lista de clientes
            </button>

            {/* Blacklist Banner */}
            {client.is_blacklisted && (
                <div className="alert alert-danger d-flex align-items-center gap-3 rounded-4 shadow-sm mb-4">
                    <AlertTriangle size={24} className="flex-shrink-0" />
                    <div>
                        <h5 className="alert-heading mb-1 fw-bold">Cliente em Blacklist</h5>
                        <p className="mb-0">{client.blacklist_reason || 'Sem razão especificada.'}</p>
                    </div>
                </div>
            )}

            {/* Header Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 glassmorphism">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                            <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                {client.name}
                            </h2>
                            {client.nickname && <h5 className="text-muted mb-3">{client.nickname}</h5>}

                            <div className="d-flex flex-wrap gap-4 mt-3">
                                {client.nif && (
                                    <div className="d-flex align-items-center gap-2 text-secondary">
                                        <Info size={16} /> <span>NIF: {client.nif}</span>
                                    </div>
                                )}
                                {(client.address || client.city) && (
                                    <div className="d-flex align-items-center gap-2 text-secondary">
                                        <MapPin size={16} />
                                        <span>
                                            {client.address}
                                            {client.address && client.city ? ', ' : ''}
                                            {client.postCode ? `${client.postCode} ` : ''}
                                            {client.city}
                                        </span>
                                    </div>
                                )}
                                {/* Contatos (se existissem na interface / API, adicionaríamos aqui, como email e telefone) */}
                            </div>
                        </div>
                        <button
                            className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit size={16} /> Editar
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Overview / Toggles */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                    <div
                        className={`card border-0 shadow-sm rounded-4 text-center p-3 h-100 transition-all ${showUsers ? 'ring-2 ring-primary bg-primary bg-opacity-10' : 'hover-bg-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setShowUsers(!showUsers); setShowEquipments(false); }}
                    >
                        <Users size={32} className="text-primary mx-auto mb-2" />
                        <h3 className="fw-bold mb-0">{users.length}</h3>
                        <span className="text-muted small">Ver Utilizadores Associados</span>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div
                        className={`card border-0 shadow-sm rounded-4 text-center p-3 h-100 transition-all ${showEquipments ? 'ring-2 ring-success bg-success bg-opacity-10' : 'hover-bg-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setShowEquipments(!showEquipments); setShowUsers(false); }}
                    >
                        <MonitorSmartphone size={32} className="text-success mx-auto mb-2" />
                        <h3 className="fw-bold mb-0">{equipments.length}</h3>
                        <span className="text-muted small">Ver Equipamentos Registados</span>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="sections-container">
                {showUsers && (
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold mb-0">Utilizadores Associados</h5>
                        </div>
                        {isLoadingUsers ? (
                            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary"></span></div>
                        ) : users.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <Users size={48} className="mb-3 opacity-50" />
                                <p>Nenhum utilizador associado a esta empresa.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Nome</th>
                                            <th>Email</th>
                                            <th className="text-end">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td className="fw-medium">{user.first_name} {user.last_name}</td>
                                                <td className="text-muted">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Mail size={14} /> {user.email}
                                                    </div>
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-light rounded-pill" onClick={() => {
                                                        setSelectedUser({ ...user, role: UserRole.CLIENT });
                                                        setIsUserModalOpen(true);
                                                    }}>Ver</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {showEquipments && (
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold mb-0">Equipamentos Registados</h5>
                            <button
                                className="btn btn-primary btn-sm rounded-pill"
                                onClick={() => navigate(`/equipments?client=${client.id}`)}
                            >
                                Gerir Equipamentos
                            </button>
                        </div>
                        {isLoadingEquipments ? (
                            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary"></span></div>
                        ) : equipments.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <MonitorSmartphone size={48} className="mb-3 opacity-50" />
                                <p>Nenhum equipamento associado a esta empresa.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Marca / Modelo</th>
                                            <th>Nº Série</th>
                                            <th>Alcunha</th>
                                            <th>Categoria</th>
                                            <th className="text-end">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {equipments.map(eq => (
                                            <tr key={eq.id}>
                                                <td>
                                                    <div className="fw-medium">{eq.brand}</div>
                                                    <div className="small text-muted">{eq.model}</div>
                                                </td>
                                                <td>{eq.serialNumber || '-'}</td>
                                                <td>{eq.nickname || '-'}</td>
                                                <td><span className="badge bg-light text-dark border">{eq.category || 'N/A'}</span></td>
                                                <td className="text-end">
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary rounded-pill"
                                                        onClick={() => navigate(`/equipments/${eq.id}/history`)}
                                                    >
                                                        Detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EditClientModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                client={client || null}
                onSave={async (updatedClient) => {
                    await updateMutation.mutateAsync(updatedClient);
                }}
            />

            <UserDetailModal
                isOpen={isUserModalOpen}
                onClose={() => {
                    setIsUserModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onUserUpdated={() => queryClient.invalidateQueries({ queryKey: ['client-users', id] })}
                onUserDeleted={() => queryClient.invalidateQueries({ queryKey: ['client-users', id] })}
                currentUserRole={currentUser?.role as any}
            />
        </div>
    );
}
