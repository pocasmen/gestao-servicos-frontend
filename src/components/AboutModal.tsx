import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Cpu, Database, Activity, Clock, Globe } from 'lucide-react';
import apiClient from '../apiClient';
import { logger } from '../utils/logger';

interface SystemStatus {
    version: string;
    dbStatus: string;
    environment: string;
    uptime: number;
    nodeVersion: string;
    memoryUsage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    };
    timestamp: string;
}

interface AboutModalProps {
    show: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ show, onClose }) => {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [latency, setLatency] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = async () => {
        setLoading(true);
        setError(null);
        const start = performance.now();
        try {
            const response = await apiClient.get('/api/status');
            const end = performance.now();
            setLatency(Math.round(end - start));
            setStatus(response.data.data);
        } catch (err) {
            setError('Erro ao obter estado do sistema');
            logger.error({ err }, 'Error in AboutModal fetchStatus');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchStatus();
        }
    }, [show]);

    if (!show) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0) parts.push(`${mins}m`);
        parts.push(`${secs}s`);
        return parts.join(' ');
    };

    const modalContent = (
        <div
            className="modal show d-block"
            tabIndex={-1}
            style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                zIndex: 1060
            }}
            onClick={onClose}
        >
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                <div className="modal-content border-0 shadow-lg bg-dark text-light border border-secondary border-opacity-25">
                    <div className="modal-header border-secondary border-opacity-25 pb-2">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <Info size={20} className="text-info" /> Acerca do Sistema
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        {loading && !status ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-info" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3 text-secondary">A obter informações...</p>
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-25 text-danger">
                                {error}
                            </div>
                        ) : (
                            <div className="row g-4">
                                <div className="col-12">
                                    <div className="p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-10">
                                        <h6 className="text-secondary text-uppercase small fw-bold mb-3 d-flex align-items-center gap-2">
                                            <Cpu size={14} /> Versões
                                        </h6>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-secondary">Frontend</span>
                                            <span className="badge bg-primary px-3">v{__APP_VERSION__}</span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span className="text-secondary">Backend</span>
                                            <span className="badge bg-info px-3 text-dark">v{status?.version || '...'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-10 h-100">
                                        <h6 className="text-secondary text-uppercase small fw-bold mb-3 d-flex align-items-center gap-2">
                                            <Database size={14} /> Base de Dados
                                        </h6>
                                        <div className={`fw-bold d-flex align-items-center gap-2 ${status?.dbStatus === 'Connected' ? 'text-success' : 'text-danger'}`}>
                                            <div className={`rounded-circle ${status?.dbStatus === 'Connected' ? 'bg-success' : 'bg-danger'}`} style={{ width: 8, height: 8 }}></div>
                                            {status?.dbStatus || 'Desconhecido'}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-10 h-100">
                                        <h6 className="text-secondary text-uppercase small fw-bold mb-3 d-flex align-items-center gap-2">
                                            <Activity size={14} /> Latência
                                        </h6>
                                        <div className={`fw-bold ${latency && latency < 200 ? 'text-success' : latency && latency < 500 ? 'text-warning' : 'text-danger'}`}>
                                            {latency ? `${latency} ms` : '...'}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-10">
                                        <h6 className="text-secondary text-uppercase small fw-bold mb-3 d-flex align-items-center gap-2">
                                            <Globe size={14} /> Ambiente e Sistema
                                        </h6>
                                        <div className="small">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary">Node.js</span>
                                                <span className="text-light fw-medium">{status?.nodeVersion}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary">Ambiente</span>
                                                <span className="text-light text-capitalize fw-medium">{status?.environment}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary">Memória (RSS)</span>
                                                <span className="text-light fw-medium">{status ? formatBytes(status.memoryUsage.rss) : '...'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary">Uptime</span>
                                                <span className="text-light fw-medium">{status ? formatUptime(status.uptime) : '...'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-secondary">Último Build</span>
                                                <span className="text-light" style={{ fontSize: '0.75rem' }}>{new Date(__BUILD_TIME__).toLocaleString('pt-PT')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer border-secondary border-opacity-25">
                        <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose}>Fechar</button>
                        <button
                            type="button"
                            className="btn btn-primary d-flex align-items-center gap-2 px-4"
                            onClick={(e) => { e.stopPropagation(); fetchStatus(); }}
                            disabled={loading}
                        >
                            <Clock size={16} /> Atualizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AboutModal;
