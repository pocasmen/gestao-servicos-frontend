import React, { useState } from 'react';
import apiClient from '../apiClient';

type Status = 'idle' | 'loading' | 'success' | 'error';

const TestEmailPage: React.FC = () => {
    const [to, setTo]         = useState('pedro@microatomo.pt');
    const [status, setStatus] = useState<Status>('idle');
    const [result, setResult] = useState<any>(null);

    const handleSend = async () => {
        setStatus('loading');
        setResult(null);
        try {
            const { data } = await apiClient.post('/api/test-email', { to });
            setResult(data);
            setStatus('success');
        } catch (err: any) {
            setResult(err.response?.data || { error: err.message });
            setStatus('error');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f5f9',
            fontFamily: 'system-ui, sans-serif',
            padding: '24px',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '40px',
                width: '100%',
                maxWidth: '480px',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <span style={{ fontSize: '32px' }}>📧</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                            Teste de Email
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                            Brevo HTTP API — verificação de integração
                        </p>
                    </div>
                </div>

                {/* Form */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Destinatário
                </label>
                <input
                    type="email"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        marginBottom: '20px',
                        boxSizing: 'border-box',
                        outline: 'none',
                    }}
                />

                <button
                    onClick={handleSend}
                    disabled={status === 'loading' || !to}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: status === 'loading' ? '#93c5fd' : '#2563eb',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                    }}
                >
                    {status === 'loading' ? '⏳ A enviar...' : '🚀 Enviar Email de Teste'}
                </button>

                {/* Result */}
                {result && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        borderRadius: '10px',
                        background: status === 'success' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                        <p style={{
                            margin: '0 0 8px',
                            fontWeight: 700,
                            color: status === 'success' ? '#16a34a' : '#dc2626',
                            fontSize: '15px',
                        }}>
                            {status === 'success' ? '✅ Email enviado com sucesso!' : '❌ Erro ao enviar email'}
                        </p>
                        <pre style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#374151',
                            background: 'transparent',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                        }}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Info strip */}
                <div style={{
                    marginTop: '24px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '12px',
                    color: '#92400e',
                }}>
                    <strong>Nota:</strong> O remetente <code>EMAIL_FROM</code> tem de estar verificado no Brevo.
                    Se receber o erro <em>"valid sender email required"</em>, verifica o sender no painel do Brevo.
                </div>
            </div>
        </div>
    );
};

export default TestEmailPage;
