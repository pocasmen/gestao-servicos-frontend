import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import UserDetailModal from '../components/TechnicianDetailModal';
import { AuthContext } from '../App';

// Updated interface to match the new backend response
export interface AppUser {
  id: string; // Now a UUID string
  email: string;
  role: 'admin' | 'technician' | 'office_staff' | 'super_admin';
  first_name: string;
  last_name: string;
  color: string;
  telegramchatid: string;
  name: string; // Combined name for display
  daily_notifications_enabled?: boolean;
  notification_time?: string;
  phone?: string;
  google_calendar_color_id?: string;
}

// New form to invite users (technicians, admins, or clients)
const InviteTechnicianForm: React.FC<{ onUserInvited: () => void; currentUserRole: string }> = ({ onUserInvited, currentUserRole }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [color, setColor] = useState('#3174ad');
  const [role, setRole] = useState<'technician' | 'admin' | 'office_staff' | 'super_admin'>('technician');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const invitationData: any = {
      email,
      role,
      first_name: firstName,
      last_name: lastName,
      color: color,
    };

    apiClient.post('/admin/invite-user', invitationData)
      .then((response) => {
        setSuccess(response.data.message || `Convite enviado para ${email}.`);
        // Reset form
        setEmail('');
        setFirstName('');
        setLastName('');
        setRole('technician');
        setColor('#3174ad');
        onUserInvited();
      })
      .catch((err: any) => {
        const errorMessage = err.response?.data?.error || "Erro ao enviar convite.";
        console.error("Erro ao convidar utilizador:", err);
        setError(errorMessage);
      });
  };

  return (
    <div className="mb-4">
      <h2>Convidar Novo Utilizador</h2>
      <form onSubmit={handleSubmit} className="p-3 border rounded">
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Função (Role)</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="technician">Técnico</option>
              <option value="office_staff">Administrativo (Office Staff)</option>
              <option value="admin">Admin</option>
              {currentUserRole === 'super_admin' && (
                <option value="super_admin">Super Admin</option>
              )}
            </select>
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
        <div className="form-group mt-2">
          <label>Cor do Calendário</label>
          <input type="color" className="form-control form-control-color" value={color} onChange={e => setColor(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary mt-3">Enviar Convite</button>
      </form>
    </div>
  );
};

const UserList: React.FC<{ users: AppUser[], onSelectUser: (user: AppUser) => void }> = ({ users, onSelectUser }) => {
  return (
    <div>
      <h2>Utilizadores Registados</h2>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Função</th>
            <th>Cor</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} onClick={() => onSelectUser(user)} style={{ cursor: 'pointer' }}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td><span className={`badge bg-${user.role === 'admin' ? 'danger' : 'secondary'}`}>{user.role}</span></td>
              <td>
                <div style={{ width: '20px', height: '20px', backgroundColor: user.color, borderRadius: '50%' }}></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main page, updated to use the new components and data fetching
const TechniciansPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const fetchUsers = () => {
    apiClient.get('/api/technicians').then(response => {
      setUsers(response.data);
    })
      .catch((error: any) => {
        console.error("Erro ao carregar utilizadores:", error);
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
    <div className="container mt-4">
      <InviteTechnicianForm onUserInvited={handleUserChange} currentUserRole={user?.user_metadata?.role || ''} />
      <hr />
      <UserList users={users} onSelectUser={handleSelectUser} />

      {selectedUser && (
        <UserDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          user={selectedUser}
          onUserUpdated={handleUserChange}
          onUserDeleted={handleUserChange}
          currentUserRole={user?.user_metadata?.role || ''}
        />
      )}
    </div>
  );
};

export default TechniciansPage;
