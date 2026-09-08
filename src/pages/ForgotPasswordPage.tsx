import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import logger from '../utils/logger';

type PageStatus = 'idle' | 'loading' | 'sent' | 'error';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<PageStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage(null);

        try {
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            setStatus('sent');
        } catch (err: any) {
            logger.error(err, '[ForgotPassword] Error sending reset email');
            setErrorMessage(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
            setStatus('error');
        }
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8f9fa)' }}
        >
            <div
                className="card shadow"
                style={{ width: '100%', maxWidth: '440px', border: 'none', borderRadius: '16px' }}
            >
                <div className="card-body p-5">
                    {/* Icon */}
                    <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: 64, height: 64,
                            background: 'linear-gradient(135deg, #0d6efd22, #0d6efd44)',
                            color: '#0d6efd',
                        }}
                    >
                        <i className="bi bi-key-fill fs-3" />
                    </div>

                    <h4 className="fw-bold text-center mb-1">Recuperar Password</h4>

                    {/* ── Sent state ── */}
                    {status === 'sent' ? (
                        <div className="text-center mt-3">
                            <div className="alert alert-success d-flex align-items-start gap-2 text-start" role="alert">
                                <i className="bi bi-check-circle-fill flex-shrink-0 mt-1" />
                                <div>
                                    <strong>Email enviado!</strong>
                                    <p className="mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
                                        Se o endereço <strong>{email}</strong> estiver registado, receberá um link
                                        para redefinir a sua password em breve. Verifique também a pasta de spam.
                                    </p>
                                </div>
                            </div>
                            <Link to="/login" className="btn btn-outline-primary w-100 mt-2" style={{ borderRadius: '10px' }}>
                                <i className="bi bi-arrow-left me-2" />
                                Voltar ao Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-muted text-center mb-4" style={{ fontSize: '0.92rem' }}>
                                Introduza o seu email e enviaremos um link para redefinir a sua password.
                            </p>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="forgot-email" className="form-label fw-semibold">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="forgot-email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="o.seu@email.com"
                                        required
                                        autoComplete="email"
                                        autoFocus
                                        disabled={status === 'loading'}
                                        style={{ borderRadius: '10px' }}
                                    />
                                </div>

                                {status === 'error' && errorMessage && (
                                    <div className="alert alert-danger py-2 d-flex align-items-center gap-2" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                                        <span style={{ fontSize: '0.9rem' }}>{errorMessage}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    id="btn-send-reset"
                                    className="btn btn-primary w-100"
                                    disabled={status === 'loading'}
                                    style={{ borderRadius: '10px', padding: '0.6rem' }}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                            A enviar...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-send me-2" />
                                            Enviar Link de Recuperação
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="text-center mt-3">
                                <Link to="/login" className="text-muted text-decoration-none" style={{ fontSize: '0.9rem' }}>
                                    <i className="bi bi-arrow-left me-1" />
                                    Voltar ao Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
