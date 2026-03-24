import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';

const RegisterPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { alert } = useConfirm();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      alert('Token de convite inválido ou em falta. Por favor, use o link que recebeu no seu email.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('As passwords não coincidem.');
      return;
    }

    if (!token) {
      alert('Token de convite inválido ou em falta.');
      return;
    }

    try {
      await apiClient.post('/api/auth/register', { token, password, firstName, lastName, phoneNumber });
      alert('Conta criada com sucesso! Será redirecionado para a página de login em 3 segundos...', 'Sucesso');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      logger.error(err);
      alert(err.response?.data?.error || 'Ocorreu um erro ao criar a conta.');
    }
  };

  if (!token) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="alert alert-danger">
              <h4>Acesso Inválido</h4>
              <p>Não foi encontrado um token de convite. O registo só pode ser feito através de um link de convite válido enviado por email.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title text-center mb-4">Finalizar Registo</h3>
              <p className="text-muted text-center">Bem-vindo! Por favor, complete os seus dados e defina a sua password.</p>
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <label htmlFor="firstName">Primeiro Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="lastName">Último Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="phoneNumber">Nº de Telefone (Opcional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <hr />
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
                <button type="submit" className="btn btn-primary w-100">Criar Conta</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

