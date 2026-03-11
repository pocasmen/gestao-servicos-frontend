import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import logger from '../utils/logger';

/**
 * S3 — Intermediate invite landing page.
 *
 * Why this page exists:
 *   Email clients (Microsoft SafeLinks, Gmail proxy) do a GET prefetch on all
 *   links before the user clicks them. If the invite link pointed directly to
 *   /complete-registration, the Supabase SDK would auto-process the token on
 *   that GET and consume it. The next time the real user clicks the link, the
 *   token is already spent → "link expired".
 *
 *   This page is inert on load: it only reads the URL params/hash to detect
 *   that a valid token is present and renders a button. The actual
 *   supabase.auth.verifyOtp() call (which consumes the token) is deferred until
 *   the user explicitly clicks the button — something a scanner will never do.
 *
 * Token format handled:
 *   - PKCE (new):  ?token_hash=...&type=invite
 *   - Legacy hash: #access_token=...&type=invite
 */
const AcceptInvitePage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Detect which token format is present
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const tokenHash = searchParams.get('token_hash');
    const typeFromQuery = searchParams.get('type');

    const accessTokenFromHash = hashParams.get('access_token');
    const refreshTokenFromHash = hashParams.get('refresh_token');
    const typeFromHash = hashParams.get('type');

    const isPKCE = Boolean(tokenHash && typeFromQuery === 'invite');
    const isLegacy = Boolean(accessTokenFromHash && typeFromHash === 'invite');
    const hasValidToken = isPKCE || isLegacy;

    // Anti-bfcache (S2): reload if this page is restored from the browser cache
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const handleActivate = async () => {
        setStatus('loading');
        setErrorMessage(null);

        try {
            // S1 — Clear any stale session from localStorage before processing
            // the new invite token. This prevents a "ghost session" (from a
            // previously deleted user) from conflicting with the new token.
            await supabase.auth.signOut({ scope: 'local' });

            if (isPKCE && tokenHash) {
                // New PKCE flow — verifyOtp actually consumes the token
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: 'invite',
                });
                if (error) throw error;

            } else if (isLegacy && accessTokenFromHash && refreshTokenFromHash) {
                // Legacy hash flow — set the session directly
                const { error } = await supabase.auth.setSession({
                    access_token: accessTokenFromHash,
                    refresh_token: refreshTokenFromHash,
                });
                if (error) throw error;
            } else {
                throw new Error('Token de convite inválido ou em falta.');
            }

            // Clean up the URL before redirecting so the token is not re-read
            window.history.replaceState(null, '', '/accept-invite');

            navigate('/complete-registration', { replace: true });

        } catch (err: any) {
            logger.error(err, '[AcceptInvite] Failed to verify invite token');
            setErrorMessage(
                err.message?.includes('expired') || err.message?.includes('invalid')
                    ? 'Este link de convite expirou ou já foi utilizado. Por favor, peça um novo convite ao administrador.'
                    : err.message || 'Ocorreu um erro ao processar o convite.'
            );
            setStatus('error');
        }
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8f9fa)' }}
        >
            <div className="card shadow" style={{ width: '100%', maxWidth: '480px', border: 'none', borderRadius: '16px' }}>
                <div className="card-body p-5 text-center">

                    {/* Icon */}
                    <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: 72,
                            height: 72,
                            background: 'linear-gradient(135deg, #0d6efd22, #0d6efd44)',
                            color: '#0d6efd',
                        }}
                    >
                        <i className="bi bi-envelope-check-fill fs-2" />
                    </div>

                    <h4 className="fw-bold mb-2">Convite Recebido</h4>

                    {hasValidToken && status !== 'error' ? (
                        <>
                            <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                                Foi convidado(a) para aceder à plataforma.
                                Clique no botão abaixo para ativar a sua conta e definir a sua password.
                            </p>
                            <button
                                id="btn-activate-account"
                                className="btn btn-primary btn-lg w-100"
                                onClick={handleActivate}
                                disabled={status === 'loading'}
                                style={{ borderRadius: '10px' }}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                        A verificar...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-shield-check me-2" />
                                        Ativar a Minha Conta
                                    </>
                                )}
                            </button>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <div className="alert alert-danger text-start mt-3" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2" />
                                {errorMessage}
                            </div>
                            <a href="/login" className="btn btn-outline-secondary mt-2 w-100" style={{ borderRadius: '10px' }}>
                                Voltar ao Login
                            </a>
                        </>
                    ) : (
                        // No token in URL — most likely a scanner or direct navigation
                        <>
                            <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                                Este link não contém um convite válido.
                                Por favor, verifique o seu email e clique no link de convite original.
                            </p>
                            <a href="/login" className="btn btn-outline-primary w-100" style={{ borderRadius: '10px' }}>
                                Ir para o Login
                            </a>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AcceptInvitePage;
