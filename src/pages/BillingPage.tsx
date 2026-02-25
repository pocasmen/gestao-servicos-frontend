import React, { useState, useEffect, useContext } from 'react';
import { getBillingTasks, getBillingStats, updateBillingTaskStatus, deleteBillingTask } from '../services/billingService';
import logger from '../utils/logger';
import { BillingStatus, BillingTask } from '../types';
import { UserRole } from '../constants/enums';
// Eliminado react-bootstrap
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { AuthContext } from '../contexts/AuthContext';
import { Pencil, Trash2, Check, X, Unlock, FileCheck, Receipt } from 'lucide-react';

const BillingPage: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState<BillingTask[]>([]);
    const [stats, setStats] = useState({ total: 0, pending_completion: 0, report_issued: 0, ready_for_billing: 0, billed: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<BillingTask | null>(null);
    const [noteContent, setNoteContent] = useState('');
    const { confirm } = useConfirm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksData, statsData] = await Promise.all([getBillingTasks(), getBillingStats()]);
            setTasks(tasksData);
            setStats({
                total: statsData.total || 0,
                pending_completion: statsData.pending_completion || 0,
                report_issued: statsData.report_issued || 0,
                ready_for_billing: statsData.ready_for_billing || 0,
                billed: statsData.billed || 0
            });
        } catch (error: unknown) {
            logger.error(error, 'Failed to fetch billing data:');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusChange = async (task: BillingTask, newStatus: BillingStatus) => {
        if (newStatus === BillingStatus.BILLED) {
            const confirmed = await confirm('Tem a certeza que deseja marcar como Faturado?');
            if (!confirmed) return;
        }

        try {
            await updateBillingTaskStatus(task.id, newStatus);
            fetchData();
        } catch (error: unknown) {
            logger.error(error, 'Error updating status:');
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
            default: return <span className="badge bg-light text-dark">{status}</span>;
        }
    };

    const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

    return (
        <div className="container-fluid mt-4">
            <h1 className="mb-4">Gestão de Faturação</h1>

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
                            <option value="all">Todos os Estados</option>
                            <option value={BillingStatus.PENDING_COMPLETION}>Pendente de Finalização</option>
                            <option value={BillingStatus.REPORT_ISSUED}>Relatório Emitido</option>
                            <option value={BillingStatus.READY_FOR_BILLING}>Pronto para Faturação</option>
                            <option value={BillingStatus.BILLED}>Faturado</option>
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
                                    <th className="border-0" style={{ width: '350px' }}>Notas</th>
                                    <th className="border-0 text-end pe-3" style={{ width: '180px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-4">A carregar...</td></tr>
                                ) : filteredTasks.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-muted">Nenhuma tarefa encontrada.</td></tr>
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
        </div>
    );
};

export default BillingPage;
