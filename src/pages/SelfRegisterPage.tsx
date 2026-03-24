import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';

const SelfRegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(false);
    const { alert } = useConfirm();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        const registrationData = {
            email,
            firstName,
            lastName,
            companyName
        };

        apiClient.post('/api/auth/self-register', registrationData)
            .then(response => {
                alert(`${response.data.message}\n\nApós validar o seu email, a sua conta ficará a aguardar aprovação de um administrador.`, 'Sucesso');
                // Clear form
                setEmail('');
                setFirstName('');
                setLastName('');
                setCompanyName('');
            })
            .catch(err => {
                const errorMessage = err.response?.data?.error || "Ocorreu um erro ao processar o seu pedido.";
                alert(errorMessage);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="card shadow-sm" style={{ width: '100%', maxWidth: '500px' }}>
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">Registo de Novo Cliente</h2>

                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Primeiro Nome</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Último Nome</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Nome da Empresa</label>
                            <input
                                type="text"
                                className="form-control"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                            {loading ? 'A registar...' : 'Registar Pedido'}
                        </button>
                    </form>

                    <div className="text-center mt-3">
                        <Link to="/login">Já tem conta? Iniciar Sessão</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelfRegisterPage;
