import React, { useState, useContext } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

const CompleteRegistrationPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useContext(AuthContext);
    const { alert } = useConfirm();
    const navigate = useNavigate();

    // If no user is in context, they shouldn't be here.
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If user is here but not pending and doesn't need to set password, redirect them
    const isPending = user.user_metadata.role === UserRole.PENDING_CLIENT;
    const mustSet = user.user_metadata.must_set_password === true;

    if (!isPending && !mustSet) {
        return <Navigate to="/" replace />;
    }

    if (isPending && !mustSet) {
        return (
            <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="card shadow-sm" style={{ width: '100%', maxWidth: '500px' }}>
                    <div className="card-body p-4 text-center">
                        <h3 className="card-title mb-3">Registo Pendente</h3>
                        <p className="card-text mb-4">
                            A sua conta aguarda aprovação de um administrador.
                            Será notificado por email assim que a sua conta for ativada.
                        </p>
                        <Link to="/login" className="btn btn-primary">Voltar ao Login</Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert('As passwords não coincidem.');
            return;
        }
        if (password.length < 6) {
            alert('A password deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
                data: { must_set_password: false }
            });
            if (updateError) {
                throw updateError;
            }

            // Refresh session to ensure all components see the updated must_set_password=false metadata
            await supabase.auth.refreshSession();

            if (isPending) {
                await alert('A sua password foi definida com sucesso. A sua conta aguarda agora a aprovação de um administrador. Será notificado quando for ativada.', 'Sucesso');
                // For pending users, we SHOULD sign out because they can't do anything yet
                await supabase.auth.signOut({ scope: 'local' });
                navigate('/login', { replace: true });
            } else {
                await alert('A sua password foi definida com sucesso. Já pode aceder à plataforma com as suas novas credenciais.', 'Sucesso');
                // For approved users, they can just stay in!
                // App.tsx handles the redirection based on profile completeness.
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            logger.error(err);
            alert(err.message || 'Ocorreu um erro ao definir a sua password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="card shadow-sm" style={{ width: '100%', maxWidth: '500px' }}>
                <div className="card-body p-4">
                    <h3 className="card-title text-center mb-4">Finalizar Registo</h3>
                    <p className="text-muted text-center">Bem-vindo(a), {user.email}. Por favor, defina a sua password para completar o registo.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-3">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group mb-3">
                            <label htmlFor="confirmPassword">Confirmar Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                            {loading ? 'A guardar...' : 'Definir Password e Concluir'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CompleteRegistrationPage;
