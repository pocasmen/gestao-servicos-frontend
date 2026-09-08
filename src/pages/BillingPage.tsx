import React, { useState, useEffect, useContext, useMemo } from 'react';
import { getBillingTasks, getBillingStats, updateBillingTaskStatus, deleteBillingTask } from '../services/billingService';
import logger from '../utils/logger';
import { BillingStatus, BillingTask } from '../types';
import { UserRole } from '../constants/enums';
// Eliminado react-bootstrap
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { AuthContext } from '../contexts/AuthContext';
import { Pencil, Trash2, Check, X, Unlock, FileCheck, Receipt, AlertTriangle } from 'lucide-react';

const BillingPage: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState<BillingTask[]>([]);
    const [stats, setStats] = useState({ total: 0, pending_completion: 0, report_issued: 0, ready_for_billing: 0, billed: 0, needs_review: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('pending');
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<BillingTask | null>(null);
    const [noteContent, setNoteContent] = useState('');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const { confirm } = useConfirm();

    // Navegação Temporal (Igual ao Dashboard)
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [baseDate, setBaseDate] = useState(new Date());

    const dateRange = useMemo(() => {
        const start = new Date(baseDate);
        const end = new Date(baseDate);

        if (viewMode === 'week') {
            const day = start.getDay() || 7;
            start.setDate(start.getDate() - (day - 1));
            start.setHours(0, 0, 0, 0);

            end.setTime(start.getTime());
            end.setDate(start.getDate() + 4); // Sexta-feira
            end.setHours(23, 59, 59, 999);
        } else {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    }, [baseDate, viewMode]);

    const navigate = (direction: number) => {
        const newDate = new Date(baseDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setBaseDate(newDate);
    };

    const rangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const startStr = dateRange.start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
            const endStr = dateRange.end.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
            return `Semana de ${startStr} a ${endStr}`;
        } else {
            return dateRange.start.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
    }, [dateRange, viewMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString()
            };
            const [tasksData, statsData] = await Promise.all([getBillingTasks(params), getBillingStats(params)]);
            setTasks(tasksData);
            setStats({
                total: statsData.total || 0,
                pending_completion: statsData.pending_completion || 0,
                report_issued: statsData.report_issued || 0,
                ready_for_billing: statsData.ready_for_billing || 0,
                billed: statsData.billed || 0,
                needs_review: statsData.needs_review || 0
            });
        } catch (error: unknown) {
            logger.error(error, 'Failed to fetch billing data:');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const handleStatusChange = async (task: BillingTask, newStatus: BillingStatus) => {
        if (newStatus === BillingStatus.BILLED) {
            setSelectedTask(task);
            setInvoiceNumber(task.invoice_number || '');
            setShowInvoiceModal(true);
            return;
        }

        try {
            await updateBillingTaskStatus(task.id, newStatus);
            fetchData();
        } catch (error: unknown) {
            logger.error(error, 'Error updating status:');
        }
    };

    const handleSaveInvoice = async () => {
        if (!selectedTask) return;
        if (!invoiceNumber.trim()) {
            alert('Por favor, insira o número da fatura.');
            return;
        }

        try {
            await updateBillingTaskStatus(selectedTask.id, BillingStatus.BILLED, selectedTask.billing_notes, invoiceNumber.trim());
            setShowInvoiceModal(false);
            setInvoiceNumber('');
            fetchData();
        } catch (error: unknown) {
            logger.error(error, 'Error saving invoice number:');
            alert('Erro ao guardar o número da fatura.');
        }
    };

    const handleOpenNoteModal = (task: BillingTask) => {
        setSelectedTask(task);
        setNoteContent(task.billing_notes || '');
        setShowNoteModal(true);
    };

    const handleSaveNote = async () => {
        if (!selectedTask) return;
        try {
            await updateBillingTaskStatus(selectedTask.id, selectedTask.status, noteContent);
            setShowNoteModal(false);
            fetchData();
        } catch (error: unknown) {
            logger.error(error, 'Error saving note:');
        }
    };

    const handleDeleteTask = async (task: BillingTask) => {
        const confirmed = await confirm('Tem a certeza que deseja eliminar esta tarefa de faturação? Esta ação não pode ser desfeita.');
        if (!confirmed) return;

        try {
            await deleteBillingTask(task.id);
            fetchData();
        } catch (error: unknown) {
            logger.error(error, 'Error deleting task:');
            alert('Erro ao eliminar tarefa. Verifique as suas permissões.');
        }
    };

    const getStatusBadge = (status: BillingStatus) => {
        switch (status) {
            case BillingStatus.PENDING_COMPLETION: return <span className="badge bg-info text-dark">Pendente de Finalização</span>;
            case BillingStatus.REPORT_ISSUED: return <span className="badge bg-secondary">Relatório Emitido</span>;
            case BillingStatus.READY_FOR_BILLING: return <span className="badge bg-warning text-dark">Pronto para Faturação</span>;
            case BillingStatus.BILLED: return <span className="badge bg-success">Faturado</span>;
            case BillingStatus.NEEDS_REVIEW: return <span className="badge bg-danger">Para Revisão</span>;
            default: return <span className="badge bg-light text-dark">{status}</span>;
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'pending') {
            return t.status !== BillingStatus.BILLED;
        }
        return filter === 'all' || t.status === filter;
    });

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-3">
                        <Receipt size={40} strokeWidth={2.5} className="text-primary" />
                        <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Faturação</h1>
                    </div>
                    <p className="text-muted small m-0 fst-italic">Controlo de faturação e tarefas administrativas.</p>
                </div>

                <div className="d-flex align-items-center gap-2 glass-panel p-2 rounded-4 shadow-sm border-0">
                    <div className="btn-group me-3">
                        <button
                            className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-secondary border-0'}`}
                            onClick={() => setViewMode('week')}
                        >
                            Semana
                        </button>
                        <button
                            className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-secondary border-0'}`}
                            onClick={() => setViewMode('month')}
                        >
                            Mês
                        </button>
                    </div>

                    <div className="d-flex align-items-center gap-3 px-3 border-start">
                        <button className="btn btn-outline-primary btn-sm rounded-circle" onClick={() => navigate(-1)}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <span className="fw-bold text-capitalize" style={{ minWidth: '180px', textAlign: 'center' }}>
                            {rangeLabel}
                        </span>
                        <button className="btn btn-outline-primary btn-sm rounded-circle" onClick={() => navigate(1)}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                        <button className="btn btn-light btn-sm ms-2" onClick={() => setBaseDate(new Date())} title="Hoje">
                            Hoje
                        </button>
                    </div>
                </div>
            </div>

            {stats.needs_review > 0 && (
                <div className="alert alert-danger d-flex align-items-center shadow-sm border-0 mb-4 animate__animated animate__fadeIn" role="alert">
                    <AlertTriangle size={24} className="me-3 flex-shrink-0" />
                    <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong className="fs-5">Serviços Para Revisão!</strong><br />
                                Existem <strong>{stats.needs_review}</strong> serviços que requerem a sua atenção imediata, independentemente do período selecionado.
                            </div>
                            <button 
                                className="btn btn-danger btn-sm rounded-pill px-3 shadow-sm"
                                onClick={() => setFilter(BillingStatus.NEEDS_REVIEW)}
                            >
                                Ver Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="row mb-4">
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 text-info mb-0">{stats.pending_completion}</h2>
                            <p className="card-text text-muted mb-0">Pendentes Finalização</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 mb-0">{stats.report_issued}</h2>
                            <p className="card-text text-muted mb-0">Relatórios Por Validar</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 text-warning mb-0">{stats.ready_for_billing}</h2>
                            <p className="card-text text-muted mb-0">Prontos para Faturar</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 text-success mb-0">{stats.billed}</h2>
                            <p className="card-text text-muted mb-0">Faturados</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className={`card text-center shadow-sm ${stats.needs_review > 0 ? 'border-danger' : ''}`}>
                        <div className="card-body">
                            <h2 className={`card-title display-4 mb-0 ${stats.needs_review > 0 ? 'text-danger' : 'text-muted'}`}>{stats.needs_review}</h2>
                            <p className="card-text text-muted mb-0">Para Revisão</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 mb-0">{stats.total}</h2>
                            <p className="card-text text-muted mb-0">Total de Tarefas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center bg-white">
                    <h5 className="mb-0">Tarefas de Faturação</h5>
                    <div style={{ width: '200px' }}>
                        <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="pending">Tarefas Pendentes</option>
                            <option value="all">Todos os Estados</option>
                            <option value={BillingStatus.PENDING_COMPLETION}>Pendente de Finalização</option>
                            <option value={BillingStatus.REPORT_ISSUED}>Relatório Emitido</option>
                            <option value={BillingStatus.READY_FOR_BILLING}>Pronto para Faturação</option>
                            <option value={BillingStatus.BILLED}>Faturado</option>
                            <option value={BillingStatus.NEEDS_REVIEW}>Para Revisão</option>
                        </select>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th className="border-0 ps-3" style={{ width: '100px' }}>Nº Rel.</th>
                                    <th className="border-0" style={{ width: '110px' }}>Data</th>
                                    <th className="border-0">Cliente</th>
                                    <th className="border-0" style={{ width: '150px' }}>Estado</th>
                                    <th className="border-0" style={{ width: '150px' }}>Nº Fatura</th>
                                    <th className="border-0" style={{ width: '350px' }}>Notas</th>
                                    <th className="border-0 text-end pe-3" style={{ width: '180px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-4">A carregar...</td></tr>
                                ) : filteredTasks.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhuma tarefa encontrada.</td></tr>
                                ) : (
                                    filteredTasks.map(task => {
                                        logger.debug(task, 'Billing Task Data:');
                                        return (
                                            <tr key={task.id}>
                                                <td>
                                                    <Link to={`/report/print/${task.report_id}`} target="_blank" className="text-decoration-none fw-bold">
                                                        {task.reports?.report_number || `#${task.report_id}`}
                                                    </Link>
                                                </td>
                                                <td>
                                                    {new Date(task.reports?.serviceDate || task.created_at).toLocaleDateString('pt-PT')}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        // Extrair Report (pode ser objeto ou array)
                                                        const r = Array.isArray(task.reports) ? task.reports[0] : task.reports;

                                                        // Se não houver report, tentar campos denormalizados na própria task (se existirem)
                                                        if (!r) return (task as any).clientName || (task as any).client_name || 'Cliente';

                                                        // Extrair Cliente do Report
                                                        const client = (r as any)?.clients;
                                                        const c = Array.isArray(client) ? client[0] : client;

                                                        // Retornar a melhor opção disponível
                                                        return c?.name || (r as any)?.clientName || (r as any)?.client_name || (task as any).clientName || 'Cliente';
                                                    })()}
                                                </td>
                                                <td>{getStatusBadge(task.status)}</td>
                                                <td>{task.invoice_number || '-'}</td>
                                                <td>
                                                    <span className="text-truncate d-inline-block" style={{ maxWidth: '350px' }} title={task.billing_notes}>
                                                        {task.billing_notes || '-'}
                                                    </span>
                                                </td>
                                                <td className="text-end pe-3">
                                                    <div className="btn-group">
                                                        <button className="btn btn-outline-primary btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleOpenNoteModal(task)} title="Adicionar/Editar Nota">
                                                            <Pencil size={18} />
                                                        </button>
                                                        {task.status === BillingStatus.PENDING_COMPLETION && (
                                                            <button className="btn btn-outline-info btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleStatusChange(task, BillingStatus.REPORT_ISSUED)} title="Libertar Relatório">
                                                                <Unlock size={18} />
                                                            </button>
                                                        )}
                                                        {task.status === BillingStatus.REPORT_ISSUED && (
                                                            <button className="btn btn-outline-warning btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleStatusChange(task, BillingStatus.READY_FOR_BILLING)} title="Validar Relatório">
                                                                <FileCheck size={18} />
                                                            </button>
                                                        )}
                                                        {task.status === BillingStatus.READY_FOR_BILLING && (
                                                            <button className="btn btn-outline-success btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleStatusChange(task, BillingStatus.BILLED)} title="Marcar como Faturado">
                                                                <Receipt size={18} />
                                                            </button>
                                                        )}
                                                        {task.status === BillingStatus.BILLED && (
                                                            <button className="btn btn-outline-secondary btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleStatusChange(task, BillingStatus.BILLED)} title="Editar Nº Fatura">
                                                                <Receipt size={18} />
                                                            </button>
                                                        )}
                                                        {task.status === BillingStatus.NEEDS_REVIEW && (
                                                            <button className="btn btn-outline-danger btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleStatusChange(task, BillingStatus.READY_FOR_BILLING)} title="Aceitar Revisão e colocar Pronto para Faturar">
                                                                <AlertTriangle size={18} />
                                                            </button>
                                                        )}
                                                        {(user?.user_metadata?.role === UserRole.ADMIN || user?.user_metadata?.role === UserRole.SUPER_ADMIN) && (
                                                            <button className="btn btn-outline-danger btn-sm shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => handleDeleteTask(task)} title="Eliminar Tarefa">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showNoteModal && (
                <>
                    <div className="modal show fade d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Notas de Faturação</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowNoteModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Notas Internas</label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="Adicione informações relevantes para a faturação..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary shadow-sm" onClick={() => setShowNoteModal(false)} title="Cancelar">
                                        <X size={20} />
                                    </button>
                                    <button type="button" className="btn btn-primary shadow-sm" onClick={handleSaveNote} title="Guardar Nota">
                                        <Check size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            {showInvoiceModal && (
                <>
                    <div className="modal show fade d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{selectedTask?.status === BillingStatus.BILLED ? 'Editar Nº Fatura' : 'Registar Fatura'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowInvoiceModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Número da Fatura <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            placeholder="Ex: FT 2026/123"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary shadow-sm" onClick={() => setShowInvoiceModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="button" className="btn btn-success shadow-sm" onClick={handleSaveInvoice}>
                                        {selectedTask?.status === BillingStatus.BILLED ? 'Atualizar Fatura' : 'Confirmar Faturação'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    );
};

export default BillingPage;
