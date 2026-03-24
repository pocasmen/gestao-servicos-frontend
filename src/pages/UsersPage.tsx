import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import UserDetailModal from '../components/TechnicianDetailModal';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { AppUser } from './TechniciansPage'; // Reusing interface

const UserList: React.FC<{ users: AppUser[], onSelectUser: (user: AppUser) => void }> = ({ users, onSelectUser }) => {
  return (
    <div>
      <h2>Utilizadores (Clientes)</h2>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Empresa</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
             // extract client logic if any, currently we send 'client_users' object
             const clientUsers = (user as any).client_users || [];
             const companyName = clientUsers.length > 0 ? clientUsers[0].name : '-';
             
             return (
                <tr key={user.id} onClick={() => onSelectUser(user)} style={{ cursor: 'pointer' }}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{companyName}</td>
                  <td>
                    {(user.role === UserRole.CLIENT) && (
                       <button 
                         className="btn btn-sm btn-outline-warning" 
                         onClick={(e) => {
                           e.stopPropagation(); // Evitar abrir o modal
                           document.dispatchEvent(new CustomEvent('initImpersonate', { detail: user }));
                         }}
                         title="Simular Conta"
                       >
                         <i className="bi bi-person-lines-fill"></i> Simular
                       </button>
                    )}
                  </td>
                </tr>
             );
          })}
        </tbody>
      </table>
    </div>
  );
};

const UsersPage: React.FC = () => {
  const { user, startImpersonation } = useContext(AuthContext);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const { confirm, alert } = useConfirm();

  const fetchUsers = () => {
    apiClient.get('/api/auth/users').then(response => {
      setUsers(response.data);
    })
      .catch((error: any) => {
        logger.error(error, "Erro ao carregar utilizadores:");
      });
  };

  useEffect(() => {
    fetchUsers();

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
            } catch(error: any) {
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
  }, []);

  const handleSelectUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleUserChange = () => {
    fetchUsers();
  };

  return (
    <div className="container-fluid mt-4">
      <UserList users={users} onSelectUser={handleSelectUser} />

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
