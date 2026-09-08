import React, { useEffect, useState } from 'react';
import apiClient from '../apiClient';
import { Shield, CheckCircle, XCircle, Clock, Globe, Monitor, User, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import logger from '../utils/logger';

interface AuditLog {
    id: number;
    timestamp: string;
    email: string;
    status: 'success' | 'failure';
    ip: string;
    user_agent: string;
    reason: string | null;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
}

const AuthAuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 50;

    const parseUA = (ua: string) => {
        if (!ua) return 'Desconhecido';
        
        // Edge
        const edge = ua.match(/(Edg)\/([\d\.]+)/);
        if (edge) return `Edge ${edge[2].split('.')[0]}`;
        
        // Chrome
        const chrome = ua.match(/(Chrome)\/([\d\.]+)/);
        if (chrome) return `Chrome ${chrome[2].split('.')[0]}`;
        
        // Firefox
        const firefox = ua.match(/(Firefox)\/([\d\.]+)/);
        if (firefox) return `Firefox ${firefox[2].split('.')[0]}`;
        
        // Safari
        const safari = ua.match(/Version\/([\d\.]+).*Safari/);
        if (safari) return `Safari ${safari[1].split('.')[0]}`;

        return 'Browser';
    };

    const parseOS = (ua: string) => {
        if (!ua) return '';
        
        if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
        if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
        if (ua.includes('Windows NT 6.2')) return 'Windows 8';
        if (ua.includes('Windows NT 6.1')) return 'Windows 7';
        
        const android = ua.match(/Android ([\d\.]+)/);
        if (android) return `Android ${android[1]}`;
        
        const ios = ua.match(/OS ([\d_]+) like Mac OS X/);
        if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`;
        
        if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        
        return '';
    };

    const fetchLogs = async (p: number) => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/api/auth/admin/audit-logs?page=${p}&limit=${limit}`);
            setLogs(data.logs);
            setTotal(data.total);
        } catch (err) {
            logger.error(err, 'Erro ao procurar logs de auditoria:');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 d-flex align-items-center gap-2">
                        <Shield className="text-primary" /> 
                        Logs de Auditoria de Acesso
                    </h2>
                    <p className="text-muted small mb-0">Registo de todas as tentativas de login (válidas e falhadas)</p>
                </div>
                <button 
                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                    onClick={() => fetchLogs(page)}
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-muted small text-uppercase fw-bold">
                            <tr>
                                <th className="px-4 py-3">Utilizador / Email</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Data e Hora</th>
                                <th className="px-4 py-3">IP / Dispositivo</th>
                                <th className="px-4 py-3">Detalhes / Erro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">A carregar...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-muted">
                                        Nenhum log encontrado.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={log.status === 'failure' ? 'table-danger-hover' : ''}>
                                        <td className="px-4 py-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className={`p-2 rounded-circle ${log.status === 'success' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-nowrap">{log.first_name ? `${log.first_name} ${log.last_name}` : 'Visitante'}</div>
                                                    <div className="small text-muted">{log.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.status === 'success' ? (
                                                <span className="badge bg-success-active border-0 rounded-pill px-3 py-2 small">
                                                    <CheckCircle size={12} className="me-1" /> Sucesso
                                                </span>
                                            ) : (
                                                <span className="badge bg-danger-active border-0 rounded-pill px-3 py-2 small">
                                                    <XCircle size={12} className="me-1" /> Falha
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="small d-flex align-items-center gap-1 text-nowrap">
                                                <Clock size={14} className="text-muted" />
                                                {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="small mb-1 d-flex align-items-center gap-1 fw-medium">
                                                <Globe size={14} className="text-primary" />
                                                {log.ip === '::1' || log.ip === '127.0.0.1' ? 'Localhost (Este PC)' : log.ip}
                                            </div>
                                            <div className="small text-muted text-truncate d-flex align-items-center gap-1" style={{ maxWidth: '180px' }} title={log.user_agent}>
                                                <Monitor size={14} />
                                                {parseUA(log.user_agent)} {parseOS(log.user_agent) && `em ${parseOS(log.user_agent)}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.reason ? (
                                                <div className="small text-danger bg-danger-subtle p-1 px-2 rounded-2 border border-danger-subtle" style={{ maxWidth: '250px' }}>
                                                    {log.reason}
                                                </div>
                                            ) : (
                                                <span className="small text-muted opacity-50">Sessão iniciada</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="card-footer bg-white border-top-0 px-4 py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="small text-muted">
                                A mostrar {logs.length} de {total} registos
                            </div>
                            <div className="d-flex gap-2">
                                <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={page === 1 || loading}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                                <div className="d-flex align-items-center px-3 small fw-bold">
                                    Página {page} de {totalPages}
                                </div>
                                <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={page === totalPages || loading}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Próximo <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthAuditPage;
