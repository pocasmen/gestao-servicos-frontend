import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import logger from '../utils/logger';

/**
 * Module-level capture — runs synchronously before Supabase SDK strips the hash.
 *
 * Supabase sends password-recovery emails with a link that contains either:
 *  - Legacy: #access_token=...&refresh_token=...&type=recovery   (hash)
 *  - PKCE:   ?token_hash=...&type=recovery                       (query string)
 */
type PageStatus = 'detecting' | 'ready' | 'loading' | 'success' | 'error' | 'no-token';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus]               = useState<PageStatus>('detecting');
    const [password, setPassword]           = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage]   = useState<string | null>(null);

    // Captura os tokens apenas uma vez no momento em que o componente é montado
    const captured = React.useMemo(() => {
        const _search = new URLSearchParams(window.location.search);
        const _hash   = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        
        return {
            tokenHash:     _search.get('token_hash'),
            typeFromQuery: _search.get('type'),
            accessToken:   _hash.get('access_token'),
            refreshToken:  _hash.get('refresh_token'),
            typeFromHash:  _hash.get('type'),
        };
    }, []);

    const isPKCE   = Boolean(captured.tokenHash && captured.typeFromQuery === 'recovery');
    const isLegacy = Boolean(captured.accessToken && captured.typeFromHash === 'recovery');

    useEffect(() => {
        const prepare = async () => {
            if (isPKCE && captured.tokenHash) {
                // PKCE: verify the token so the session is ready for updateUser
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: captured.tokenHash,
                    type: 'recovery',
                });
                if (error) {
                    logger.error(error, '[ResetPassword] verifyOtp failed');
                    setErrorMessage(
                        error.message.includes('expired') || error.message.includes('invalid')
                            ? 'Este link expirou ou já foi utilizado. Por favor, peça um novo link.'
                            : error.message
                    );
                    setStatus('error');
                    return;
                }
                window.history.replaceState(null, '', '/reset-password');
                setStatus('ready');
                return;
            }

            if (isLegacy && captured.accessToken && captured.refreshToken) {
                // Legacy: explicitly set the session from hash tokens
                const { error } = await supabase.auth.setSession({
                    access_token: captured.accessToken,
                    refresh_token: captured.refreshToken,
                });
                if (error) {
                    logger.error(error, '[ResetPassword] setSession failed');
                    setErrorMessage('Sessão de recuperação inválida. Por favor, peça um novo link.');
                    setStatus('error');
                    return;
                }
                window.history.replaceState(null, '', '/reset-password');
                setStatus('ready');
                return;
            }

            // Fallback: check if a recovery session already exists (e.g. fast navigation)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus('ready');
            } else {
                setStatus('no-token');
            }
        };

        prepare();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setErrorMessage('As passwords não coincidem.');
            return;
        }
        if (password.length < 6) {
            setErrorMessage('A password deve ter no mínimo 6 caracteres.');
            return;
        }

        setStatus('loading');
        setErrorMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // Sign out so the user logs in fresh with new credentials
            await supabase.auth.signOut({ scope: 'local' });
            setStatus('success');
        } catch (err: any) {
            logger.error(err, '[ResetPassword] updateUser failed');
            setErrorMessage(err.message || 'Ocorreu um erro ao redefinir a password.');
            setStatus('ready');
        }
    };

    // ── Render helpers ──────────────────────────────────────────────────────

    if (status === 'detecting') {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">A verificar...</span>
                    </div>
                    <p className="text-muted">A verificar o link de recuperação...</p>
                </div>
            </div>
        );
    }

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
                            background: 'linear-gradient(135deg, #19875422, #19875444)',
                            color: '#198754',
                        }}
                    >
                        <i className="bi bi-shield-lock-fill fs-3" />
                    </div>

                    {/* ── Success ── */}
                    {status === 'success' && (
                        <div className="text-center">
                            <h4 className="fw-bold mb-3">Password Redefinida!</h4>
                            <div className="alert alert-success d-flex align-items-start gap-2 text-start" role="alert">
                                <i className="bi bi-check-circle-fill flex-shrink-0 mt-1" />
                                <span>
                                    A sua password foi alterada com sucesso.
                                    Já pode fazer login com as suas novas credenciais.
                                </span>
                            </div>
                            <button
                                id="btn-go-login-after-reset"
                                className="btn btn-success w-100 mt-2"
                                style={{ borderRadius: '10px' }}
                                onClick={() => navigate('/login', { replace: true })}
                            >
                                <i className="bi bi-box-arrow-in-right me-2" />
                                Ir para o Login
                            </button>
                        </div>
                    )}

                    {/* ── No token ── */}
                    {status === 'no-token' && (
                        <div className="text-center">
                            <h4 className="fw-bold mb-3">Link Inválido</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '0.92rem' }}>
                                Este link não é válido ou já expirou. Por favor, solicite um novo link de recuperação.
                            </p>
                            <Link to="/forgot-password" className="btn btn-primary w-100" style={{ borderRadius: '10px' }}>
                                <i className="bi bi-arrow-repeat me-2" />
                                Pedir Novo Link
                            </Link>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {status === 'error' && (
                        <div className="text-center">
                            <h4 className="fw-bold mb-3">Erro de Verificação</h4>
                            <div className="alert alert-danger d-flex align-items-start gap-2 text-start" role="alert">
                                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-1" />
                                <span>{errorMessage}</span>
                            </div>
                            <Link to="/forgot-password" className="btn btn-outline-primary w-100 mt-2" style={{ borderRadius: '10px' }}>
                                <i className="bi bi-arrow-repeat me-2" />
                                Pedir Novo Link
                            </Link>
                        </div>
                    )}

                    {/* ── Ready / Loading (form) ── */}
                    {(status === 'ready' || status === 'loading') && (
                        <>
                            <h4 className="fw-bold text-center mb-1">Nova Password</h4>
                            <p className="text-muted text-center mb-4" style={{ fontSize: '0.92rem' }}>
                                Introduza e confirme a sua nova password.
                            </p>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="reset-password" className="form-label fw-semibold">
                                        Nova Password
                                    </label>
                                    <input
                                        type="password"
                                        id="reset-password"
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        autoComplete="new-password"
                                        autoFocus
                                        disabled={status === 'loading'}
                                        style={{ borderRadius: '10px' }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="reset-confirm-password" className="form-label fw-semibold">
                                        Confirmar Nova Password
                                    </label>
                                    <input
                                        type="password"
                                        id="reset-confirm-password"
                                        className="form-control"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
                                        placeholder="Repita a password"
                                        required
                                        autoComplete="new-password"
                                        disabled={status === 'loading'}
                                        style={{ borderRadius: '10px' }}
                                    />
                                </div>

                                {errorMessage && (
                                    <div className="alert alert-danger py-2 d-flex align-items-center gap-2 mb-3" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                                        <span style={{ fontSize: '0.9rem' }}>{errorMessage}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    id="btn-confirm-reset"
                                    className="btn btn-success w-100"
                                    disabled={status === 'loading'}
                                    style={{ borderRadius: '10px', padding: '0.6rem' }}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                            A guardar...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-lg me-2" />
                                            Guardar Nova Password
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
