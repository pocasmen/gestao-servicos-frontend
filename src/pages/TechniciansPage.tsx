import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import UserDetailModal from '../components/TechnicianDetailModal';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { Users } from 'lucide-react';

// Updated interface to match the new backend response
export interface AppUser {
  id: string; // Now a UUID string
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  color: string;
  telegramchatid: string;
  name: string; // Combined name for display
  daily_notifications_enabled?: boolean;
  notification_time?: string;
  phone?: string;
  google_calendar_color_id?: string;
  has_password?: boolean;
  is_profile_complete?: boolean;
  has_signature?: boolean;
}

// New form to invite users (technicians, admins, or clients)
const InviteTechnicianForm: React.FC<{ onUserInvited: () => void; currentUserRole: UserRole }> = ({ onUserInvited, currentUserRole }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [color, setColor] = useState('#3174ad');
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alert } = useConfirm();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const invitationData: any = {
      email,
      role,
      first_name: firstName,
      last_name: lastName,
      color: color,
    };

    setIsSubmitting(true);
    apiClient.post('/api/auth/admin/invite-user', invitationData)
      .then((response) => {
        alert(response.data.message || `Convite enviado para ${email}.`, 'Sucesso');
        // Reset form
        setEmail('');
        setFirstName('');
        setLastName('');
        setRole(UserRole.TECHNICIAN);
        setColor('#3174ad');
        onUserInvited();
      })
      .catch((err: any) => {
        const errorMessage = err.response?.data?.error || "Erro ao enviar convite.";
        logger.error(err, "Erro ao convidar utilizador:");
        alert(errorMessage);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="glass-card border-0 mb-4 overflow-hidden shadow-sm">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Convidar Novo Utilizador</h5>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase">Email</label>
              <input type="email" className="form-control rounded-pill px-3" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ex: tecnico@empresa.com" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase">Função (Role)</label>
              <select className="form-select rounded-pill px-3" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                <option value={UserRole.TECHNICIAN}>Técnico</option>
                <option value={UserRole.OFFICE_STAFF}>Administrativo (Office Staff)</option>
                <option value={UserRole.ADMIN}>Admin</option>
                {currentUserRole === UserRole.SUPER_ADMIN && (
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                )}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase">Cor do Calendário</label>
              <div className="d-flex gap-2 align-items-center">
                <input type="color" className="form-control form-control-color rounded-circle border-0 p-0" style={{ width: '38px', height: '38px' }} value={color} onChange={e => setColor(e.target.value)} />
                <span className="small text-muted font-monospace">{color.toUpperCase()}</span>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase">Primeiro Nome</label>
              <input type="text" className="form-control rounded-pill px-3" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase">Último Nome</label>
              <input type="text" className="form-control rounded-pill px-3" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button type="submit" className="btn btn-primary rounded-pill px-4 py-2 w-100 fw-bold shadow-sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    A enviar...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2"></i>
                    Enviar Convite
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserList: React.FC<{ users: AppUser[], onSelectUser: (user: AppUser) => void }> = ({ users, onSelectUser }) => {
  return (
    <div className="glass-card border-0 mb-4 overflow-hidden shadow-sm">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Utilizadores Registados</h5>
      </div>
      <div className="p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr className="bg-dark text-white text-uppercase small fw-bold" style={{ letterSpacing: '0.05em', fontFamily: 'var(--font-family-title)' }}>
                <th className="ps-4 py-3 border-0">Utilizador</th>
                <th className="py-3 border-0">Email</th>
                <th className="py-3 border-0">Função (Role)</th>
                <th className="text-end pe-4 py-3 border-0">Ação</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: 'none' }}>
              {users.map(user => (
                <tr key={user.id} className="shadow-sm">
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: user.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className="fw-bold text-dark">{user.name || `${user.first_name} ${user.last_name}`}</div>
                    </div>
                  </td>
                  <td className="text-muted fw-medium">{user.email}</td>
                  <td>
                    <span className={`badge border-0 rounded-pill px-3 ${user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN ? 'bg-danger bg-opacity-15 text-danger-emphasis' : 'bg-secondary bg-opacity-15 text-secondary-emphasis'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-primary border-0 rounded-pill p-0 shadow-none"
                      onClick={() => onSelectUser(user)}
                      style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="bi bi-pencil-square fs-5"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main page, updated to use the new components and data fetching
const TechniciansPage: React.FC = () => {
  const { user, startImpersonation } = useContext(AuthContext);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const { confirm, alert } = useConfirm();

  const fetchUsers = () => {
    apiClient.get('/api/technicians').then(response => {
      setUsers(response.data);
    })
      .catch((error: any) => {
        logger.error(error, "Erro ao carregar utilizadores:");
      });
  };

  useEffect(() => {
    fetchUsers();
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
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-5 mt-2">
        <div>
          <div className="d-flex align-items-center gap-3">
            <Users size={40} strokeWidth={2.5} className="text-primary" />
            <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)', fontSize: '2.5rem' }}>Equipa e Utilizadores</h1>
          </div>
          <p className="text-muted small m-0 fst-italic">Gestão de acessos, funções e notificações do sistema.</p>
        </div>
      </div>

      <InviteTechnicianForm onUserInvited={handleUserChange} currentUserRole={user?.user_metadata?.role as UserRole} />
      
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

export default TechniciansPage;
