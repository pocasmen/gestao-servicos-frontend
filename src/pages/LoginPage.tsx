import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase'; // Importar o cliente Supabase
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useContext(AuthContext); // Usar o setter do contexto
  const { alert } = useConfirm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // O backend agora faz a migração, então o signIn é o mesmo para ambos.
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (data.session) {
        // O Supabase client já gere a sessão. Apenas atualizamos o estado global.
        setSession(data.session);

        // Redirecionar com base no role guardado nos metadados do utilizador no Supabase
        const userRole = data.user.user_metadata.role;
        if (userRole === UserRole.TECHNICIAN || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OFFICE_STAFF) {
          navigate('/calendar');
        } else if (userRole === UserRole.CLIENT) {
          navigate('/portal');
        } else {
          navigate('/'); // Fallback
        }
      } else {
        throw new Error("Não foi possível obter os dados do utilizador após o login.");
      }

    } catch (err: any) {
      logger.error(err);
      // Mapear erros comuns do Supabase para mensagens mais amigáveis
      let msg = err.message || 'Ocorreu um erro ao fazer login.';
      if (err.message.includes('Invalid login credentials')) {
        msg = 'Email ou password inválidos.';
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title text-center mb-4">Login</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="form-group mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="password">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-decoration-none"
                      style={{ fontSize: '0.85rem' }}
                    >
                      Esqueceu-se da password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    className="form-control mt-1"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="mb-3" />
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'A entrar...' : 'Entrar'}
                </button>
              </form>
              <div className="text-center mt-3">
                <Link to="/self-register">Não tem conta? Registe-se aqui</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
