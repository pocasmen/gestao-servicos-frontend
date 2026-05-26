import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import UserDetailModal from '../components/TechnicianDetailModal';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { UserCircle, Search } from 'lucide-react';
import { AppUser } from './TechniciansPage'; // Reusing interface

const UserList: React.FC<{ users: AppUser[], onSelectUser: (user: AppUser) => void }> = ({ users, onSelectUser }) => {
  return (
    <div className="glass-card border-0 mb-4 overflow-hidden shadow-sm">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Utilizadores (Clientes)</h5>
      </div>
      <div className="p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-hover">
            <thead>
              <tr className="bg-dark text-white text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
                <th className="ps-4 py-3 border-0">Nome</th>
                <th className="py-3 border-0">Email</th>
                <th className="py-3 border-0">Empresa</th>
                <th className="py-3 border-0 text-center">Password</th>
                <th className="py-3 border-0 text-center">Perfil</th>
                <th className="py-3 border-0 text-center">Assinatura</th>
                <th className="text-end pe-4 py-3 border-0">Ação</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: 'none' }}>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="py-4">
                      <Search size={48} className="text-primary opacity-25 mb-3" />
                      <p className="m-0 fw-medium text-muted h5">Nenhum utilizador encontrado.</p>
                      <small className="text-muted opacity-75">Tente ajustar os termos de pesquisa.</small>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const clientUsers = (user as any).client_users || [];
                  const companyName = clientUsers.length > 0 ? clientUsers[0].name : '-';
                  const hasPassword = (user as any).has_password;
                  const isProfileComplete = (user as any).is_profile_complete;
                  const hasSignature = (user as any).has_signature;

                  return (
                    <tr key={user.id} onClick={() => onSelectUser(user)} style={{ cursor: 'pointer' }}>
                      <td className="ps-4 py-3 fw-bold">{user.name || `${user.first_name} ${user.last_name}`}</td>
                      <td className="text-muted small">{user.email}</td>
                      <td className="small">{companyName}</td>
                      <td className="text-center">
                        {hasPassword ? (
                          <i className="bi bi-check-circle-fill text-success fs-5" title="Password definida"></i>
                        ) : (
                          <i className="bi bi-x-circle-fill text-danger fs-5" title="Password não definida (Convite pendente)"></i>
                        )}
                      </td>
                      <td className="text-center">
                        {isProfileComplete ? (
                          <i className="bi bi-person-check-fill text-success fs-5" title="Perfil Completo"></i>
                        ) : (
                          <i className="bi bi-person-x-fill text-warning fs-5" title="Perfil Incompleto (Faltam dados ou associação)"></i>
                        )}
                      </td>
                      <td className="text-center">
                        {hasSignature ? (
                          <i className="bi bi-pen-fill text-success fs-5" title="Assinatura definida"></i>
                        ) : (
                          <i className="bi bi-dash-circle text-muted fs-5" title="Sem assinatura"></i>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          {(user.role === UserRole.CLIENT) && (
                            <button
                              className="btn btn-sm btn-outline-warning border-0 rounded-pill px-3 shadow-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.dispatchEvent(new CustomEvent('initImpersonate', { detail: user }));
                              }}
                              title="Simular Conta"
                            >
                              <i className="bi bi-person-lines-fill me-1"></i> Simular
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0 shadow-none"
                            style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectUser(user);
                            }}
                          >
                            <i className="bi bi-eye fs-5"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const UsersPage: React.FC = () => {
  const { user, startImpersonation } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const { confirm, alert } = useConfirm();

  const { data: categories = [] } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: async () => {
      const response = await apiClient.get('/api/equipments/categories');
      return response.data as string[];
    }
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users', debouncedSearchQuery, selectedCategory],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (selectedCategory) params.category = selectedCategory;
      const response = await apiClient.get('/api/auth/users', { params });
      return response.data as AppUser[];
    }
  });

  useEffect(() => {
    const handleImpersonateEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetUser = customEvent.detail as AppUser;

      if (await confirm({
        message: `Tem a certeza que deseja simular a conta de ${targetUser.first_name} ${targetUser.last_name}? A sua sessão será temporariamente mascarada.`,
        title: 'Iniciar Simulação',
        confirmText: 'Simular'
      })) {
        try {
          const resp = await apiClient.get(`/api/auth/admin/impersonate/${targetUser.id}`);
          if (startImpersonation) {
            startImpersonation(resp.data);
          } else {
            await alert("Erro de contexto: não foi possível inciar a simulação.");
          }
        } catch (error: any) {
          let errorMsg = "Erro ao simular utilizador.";
          if (error?.response?.data?.error) errorMsg = error.response.data.error;
          await alert(errorMsg);
        }
      }
    };

    document.addEventListener('initImpersonate', handleImpersonateEvent);

    return () => {
      document.removeEventListener('initImpersonate', handleImpersonateEvent);
    };
  }, [confirm, startImpersonation, alert]);

  const handleSelectUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleUserChange = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return (
    <div className="container-fluid mt-4">
      <div className="glass-card border-0 mb-4 overflow-hidden rounded-pill">
        <div className="p-2 d-flex align-items-center">
          <div className="input-group shadow-none bg-white rounded-pill ps-3 flex-grow-1">
            <span className="bg-transparent border-0 d-flex align-items-center text-muted pe-2">
              <Search size={18} className="opacity-50" />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-transparent py-2 shadow-none"
              placeholder="Pesquisar por primeiro nome, último nome, e-mail ou empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.95rem' }}
            />
          </div>
          <select 
            className="form-select border-0 shadow-none rounded-pill ms-2"
            style={{ width: '200px', fontSize: '0.95rem' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="alert alert-danger">
          Erro ao carregar utilizadores: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        <UserList users={users} onSelectUser={handleSelectUser} />
      )}

      {selectedUser && (
        <UserDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          user={selectedUser}
          onUserUpdated={handleUserChange}
          onUserDeleted={handleUserChange}
          currentUserRole={user?.user_metadata?.role as UserRole}
        />
      )}
    </div>
  );
};

export default UsersPage;
