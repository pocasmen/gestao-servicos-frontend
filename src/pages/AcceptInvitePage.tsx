import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import logger from '../utils/logger';

/**
 * Intermediate invite landing page (S3 - Anti email scanner prefetch).
 *
 * WHY MODULE-LEVEL CAPTURE:
 *   The Supabase JS SDK is initialized in App.tsx and immediately detects any
 *   `#access_token=...` fragment in the URL (legacy flow). It processes it
 *   asynchronously and then calls window.history.replaceState to strip the hash.
 *   By the time React renders this component and any useEffect runs, the hash
 *   is already gone.
 *
 *   Capturing at module level (outside of any hook/component) runs synchronously
 *   when this chunk is imported — before the SDK's async hash processing fires.
 *   This guarantees we always have a copy of the original URL params.
 *
 * TWO TOKEN FORMATS SUPPORTED:
 *   - Legacy (current): Supabase verifies at /auth/v1/verify, redirects here
 *     with #access_token=...&refresh_token=...&type=invite in the hash.
 *   - PKCE (future):    Email contains redirect_to with ?token_hash=...&type=invite
 *     as query params; token is NOT verified until verifyOtp() is called client-side.
 *
 * FALLBACK — Session already established:
 *   For the legacy flow, the Supabase SDK auto-processes the hash and creates
 *   the session in localStorage before the component renders. If our module-level
 *   capture missed the hash (e.g., chunk was pre-loaded), we fall back to reading
 *   the active session and checking for the must_set_password invite marker.
 */

// ─── Module-level capture (runs before Supabase SDK clears the URL) ──────────
const _search = new URLSearchParams(window.location.search);
const _hash   = new URLSearchParams(window.location.hash.replace(/^#/, ''));

const CAPTURED = {
    tokenHash:        _search.get('token_hash'),
    typeFromQuery:    _search.get('type'),
    accessToken:      _hash.get('access_token'),
    refreshToken:     _hash.get('refresh_token'),
    typeFromHash:     _hash.get('type'),
} as const;

const IS_PKCE   = Boolean(CAPTURED.tokenHash && CAPTURED.typeFromQuery === 'invite');
const IS_LEGACY = Boolean(CAPTURED.accessToken && CAPTURED.typeFromHash === 'invite');
// ─────────────────────────────────────────────────────────────────────────────

type PageStatus = 'detecting' | 'ready' | 'loading' | 'error' | 'no-token';

const AcceptInvitePage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus]           = useState<PageStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // For legacy flow: SDK may have already set the session before we render
    const [isLegacySession, setIsLegacySession] = useState(false);

    // S2 — Anti-bfcache: reload if this page is restored from browser cache
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) window.location.reload();
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // Determine if we have a valid invite to present
    useEffect(() => {
        if (IS_PKCE || IS_LEGACY) {
            // We captured token params from the URL before SDK cleared them
            setStatus('ready');
            return;
        }

        // Fallback: SDK may have auto-processed the hash (legacy flow).
        // Check if there is already an active session with the invite marker.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.user_metadata?.must_set_password === true) {
                setIsLegacySession(true);
                setStatus('ready');
            } else {
                setStatus('no-token');
            }
        });
    }, []);

    const handleActivate = async () => {
        setStatus('loading');
        setErrorMessage(null);

        try {
            if (IS_PKCE && CAPTURED.tokenHash) {
                // PKCE flow: token not yet consumed — signOut first to clear any
                // stale ghost session, then verify (S1).
                await supabase.auth.signOut({ scope: 'local' });

                const { error } = await supabase.auth.verifyOtp({
                    token_hash: CAPTURED.tokenHash,
                    type: 'invite',
                });
                if (error) throw error;

            } else if (IS_LEGACY || isLegacySession) {
                // Legacy flow: Supabase server already verified the OTP and the
                // SDK set the session from the hash. The session is valid — no
                // need to verify again; just navigate forward.
                if (IS_LEGACY && CAPTURED.accessToken && CAPTURED.refreshToken) {
                    // SDK may not have processed it yet (very rare, fast navigation).
                    // Ensure the session is explicitly set.
                    const { error } = await supabase.auth.setSession({
                        access_token: CAPTURED.accessToken,
                        refresh_token: CAPTURED.refreshToken,
                    });
                    if (error) throw error;
                }
                // Session already present (isLegacySession path) — nothing extra needed.
            } else {
                throw new Error('Não foi possível determinar o tipo de token de convite.');
            }

            // Clean up the URL before navigating
            window.history.replaceState(null, '', '/accept-invite');
            navigate('/complete-registration', { replace: true });

        } catch (err: any) {
            logger.error(err, '[AcceptInvite] Failed to process invite token');
            const msg: string = err.message ?? '';
            setErrorMessage(
                msg.includes('expired') || msg.includes('invalid') || msg.includes('Token has expired')
                    ? 'Este link de convite expirou ou já foi utilizado. Por favor, peça um novo convite ao administrador.'
                    : msg || 'Ocorreu um erro ao processar o convite. Por favor, tente novamente.'
            );
            setStatus('error');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8f9fa)' }}
        >
            <div
                className="card shadow"
                style={{ width: '100%', maxWidth: '480px', border: 'none', borderRadius: '16px' }}
            >
                <div className="card-body p-5 text-center">

                    {/* Icon */}
                    <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: 72, height: 72,
                            background: 'linear-gradient(135deg, #0d6efd22, #0d6efd44)',
                            color: '#0d6efd',
                        }}
                    >
                        <i className="bi bi-envelope-check-fill fs-2" />
                    </div>

                    <h4 className="fw-bold mb-2">Convite Recebido</h4>

                    {status === 'detecting' && (
                        <div className="d-flex justify-content-center mt-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">A verificar...</span>
                            </div>
                        </div>
                    )}

                    {(status === 'ready' || status === 'loading') && (
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
                    )}

                    {status === 'error' && (
                        <>
                            <div className="alert alert-danger text-start mt-3" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2" />
                                {errorMessage}
                            </div>
                            <a
                                href="/login"
                                className="btn btn-outline-secondary mt-2 w-100"
                                style={{ borderRadius: '10px' }}
                            >
                                Voltar ao Login
                            </a>
                        </>
                    )}

                    {status === 'no-token' && (
                        <>
                            <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                                Este link não corresponde a um convite ativo.
                                Por favor, verifique o seu email e clique no link de convite mais recente.
                            </p>
                            <a
                                href="/login"
                                className="btn btn-outline-primary w-100"
                                style={{ borderRadius: '10px' }}
                            >
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
