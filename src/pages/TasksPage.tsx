import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, Clock, Lock, Globe, Filter, AlertTriangle, Calendar as CalendarIcon, Trash2, User, Building2, Wrench, MoreVertical, Pencil, X, Check } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import logger from '../utils/logger';
import { InternalTask } from '../types';

const TasksPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm, alert } = useConfirm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<InternalTask | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('pending');

    // Navegação Temporal (Igual ao Billing/Dashboard)
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

    const { data: tasks, isLoading, isError, error } = useQuery({
        queryKey: ['internal-tasks'],
        queryFn: async () => {
            const response = await apiClient.get('/api/tasks');
            return response.data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/tasks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
        },
        onError: (err: any) => {
            logger.error(err);
            alert('Não foi possível eliminar a tarefa.');
        }
    });

    const toggleCompletionMutation = useMutation({
        mutationFn: (task: InternalTask) => {
            const completed = !task.completed;
            const completed_at = completed ? new Date().toISOString() : null;
            return apiClient.patch(`/api/tasks/${task.id}`, { ...task, completed, completed_at });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
        onError: (err: any) => {
            logger.error(err);
            alert('Não foi possível atualizar o estado da tarefa.');
        }
    });

    const handleEdit = (task: InternalTask) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedTask(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (await confirm({
            title: 'Eliminar Tarefa',
            message: 'Tem a certeza que deseja eliminar esta tarefa permanentemente?',
            variant: 'danger',
            confirmText: 'Eliminar'
        })) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleCompletion = (task: InternalTask) => {
        toggleCompletionMutation.mutate(task);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            event: 'Evento',
            training: 'Formação',
            webinar: 'Webinário',
            vacation: 'Folga/Férias',
            admin: 'Administrativo',
            other: 'Outro'
        };
        return labels[type] || type;
    };

    const getPriorityInfo = (priority: string) => {
        switch (priority) {
            case 'high': return { color: 'danger', label: 'Alta' };
            case 'medium': return { color: 'warning', label: 'Média' };
            case 'low': return { color: 'info', label: 'Baixa' };
            default: return { color: 'secondary', label: priority };
        }
    };

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((t: InternalTask) => {
            // Filtro de Estado
            if (statusFilter === 'pending' && t.completed) return false;
            if (statusFilter === 'completed' && !t.completed) return false;

            // Filtro de Tipo (Existente)
            if (filterType !== 'all' && t.type !== filterType) return false;

            // Filtro de Data
            const start = dateRange.start;
            const end = dateRange.end;
            const createdAt = new Date(t.created_at);
            const hasBlocks = t.internal_task_time_blocks && t.internal_task_time_blocks.length > 0;

            if (hasBlocks) {
                // Se tiver blocos, mostramos se algum bloco cair no intervalo
                return t.internal_task_time_blocks!.some(block => {
                    const bStart = new Date(block.start_time);
                    return bStart >= start && bStart <= end;
                });
            } else {
                // Se não tiver blocos, usamos data de criação
                return createdAt >= start && createdAt <= end;
            }
        });
    }, [tasks, statusFilter, filterType, dateRange]);

    const stats = useMemo(() => {
        if (!tasks) return { total: 0, pending: 0, completed: 0 };

        // As estatísticas consideram apenas tarefas No Intervalo de Datas
        const inRangeTasks = tasks.filter((t: InternalTask) => {
            const start = dateRange.start;
            const end = dateRange.end;
            const createdAt = new Date(t.created_at);
            const hasBlocks = t.internal_task_time_blocks && t.internal_task_time_blocks.length > 0;

            if (hasBlocks) {
                return t.internal_task_time_blocks!.some(block => {
                    const bStart = new Date(block.start_time);
                    return bStart >= start && bStart <= end;
                });
            }
            return createdAt >= start && createdAt <= end;
        });

        return {
            total: inRangeTasks.length,
            pending: inRangeTasks.filter((t: any) => !t.completed).length,
            completed: inRangeTasks.filter((t: any) => t.completed).length
        };
    }, [tasks, dateRange]);

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h1 className="mb-0">Tarefas Internas</h1>
                    <p className="text-muted mb-0">Gestão administrativa, formação e eventos de equipa.</p>
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
                        <button className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <span className="fw-bold text-capitalize" style={{ minWidth: '180px', textAlign: 'center' }}>
                            {rangeLabel}
                        </span>
                        <button className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }} onClick={() => navigate(1)}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                        <button className="btn btn-light btn-sm ms-2 fw-bold" onClick={() => setBaseDate(new Date())} title="Hoje">
                            Hoje
                        </button>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 text-info mb-0">{stats.pending}</h2>
                            <p className="card-text text-muted mb-0">Por Concluir</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 text-success mb-0">{stats.completed}</h2>
                            <p className="card-text text-muted mb-0">Concluídas</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card text-center shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title display-4 mb-0">{stats.total}</h2>
                            <p className="card-text text-muted mb-0">Total no Período</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <h5 className="mb-0">Listagem de Tarefas</h5>
                        <div style={{ width: '200px' }}>
                            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="pending">Por Concluir</option>
                                <option value="completed">Concluídas</option>
                                <option value="all">Todos os Estados</option>
                            </select>
                        </div>
                    </div>
                    <button
                        className="btn btn-success d-flex align-items-center gap-2 fw-bold"
                        onClick={handleCreate}
                    >
                        <Plus size={18} /> Nova Tarefa
                    </button>
                </div>

                <div className="card-body bg-light bg-opacity-50 p-4">
                    {/* Filtros de Tipo */}
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
                        <div className="text-muted small fw-bold text-uppercase d-flex align-items-center gap-2 me-2">
                            <Filter size={16} /> Tipo:
                        </div>
                        {['all', 'event', 'training', 'webinar', 'vacation', 'admin'].map(type => (
                            <button
                                key={type}
                                className={`btn btn-sm px-4 rounded-pill fw-semibold transition-all ${filterType === type ? 'btn-primary shadow-sm' : 'btn-white text-muted border'}`}
                                onClick={() => setFilterType(type)}
                            >
                                {type === 'all' ? 'Todos' : getTypeLabel(type)}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">A carregar tarefas...</p>
                        </div>
                    ) : isError ? (
                        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-3 p-4">
                            <AlertTriangle size={24} /> <div><strong>Erro:</strong> {(error as any).message}</div>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
                            <div className="opacity-25 mb-3"><Plus size={48} /></div>
                            <h5 className="text-muted mb-3">Nenhuma tarefa encontrada</h5>
                            <button className="btn btn-outline-primary px-4 py-2 rounded-pill fw-bold" onClick={handleCreate}>Criar Primeira Tarefa</button>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {filteredTasks.map((task: InternalTask) => {
                                const p = getPriorityInfo(task.priority);
                                return (
                                    <div key={task.id} className="col-12 col-md-6 col-xxl-4">
                                        <div className="card h-100 border-0 shadow-sm rounded-4 hover-lift overflow-hidden bg-white"
                                            onClick={() => handleEdit(task)}
                                            style={{ cursor: 'pointer' }}>

                                            <div className={`priority-strip bg-${p.color}`}></div>

                                            <div className="card-body p-4 pt-5">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <span className="badge rounded-pill bg-light text-primary border px-2 py-1 fw-bold x-small text-uppercase mb-2 d-inline-block">
                                                            {getTypeLabel(task.type)}
                                                        </span>
                                                        <h5 className="card-title fw-bold text-dark mb-0">{task.title}</h5>
                                                    </div>
                                                    <div className="d-flex gap-2 opacity-75">
                                                        {task.is_private ? <Lock size={16} className="text-warning" /> : <Globe size={16} className="text-success" />}
                                                        {task.show_on_calendar && <CalendarIcon size={16} className="text-indigo" />}
                                                    </div>
                                                </div>

                                                <p className="card-text text-muted small mb-4 line-clamp-3" style={{ minHeight: '3.5rem' }}>
                                                    {task.description}
                                                </p>

                                                <div className="d-flex flex-column gap-3 py-3 border-top border-bottom">
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <label className="text-muted x-small text-uppercase fw-bold d-block mb-1">Responsável</label>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="avatar-xs text-white" style={{ backgroundColor: task.assignee?.color || '#9ca3af' }}>
                                                                    {task.assignee?.first_name?.[0]}{task.assignee?.last_name?.[0]}
                                                                </div>
                                                                <span className="small fw-semibold">{task.assignee?.first_name} {task.assignee?.last_name?.[0]}.</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="text-muted x-small text-uppercase fw-bold d-block mb-1">Duração</label>
                                                            <div className="d-flex align-items-center gap-1 text-primary small fw-bold">
                                                                <Clock size={14} />
                                                                <span>{task.estimated_hours || 0}h</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(task.clients || task.equipments) && (
                                                        <div className="bg-light p-2 rounded-3">
                                                            {task.clients && (
                                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                                    <Building2 size={14} className="text-muted" />
                                                                    <span className="x-small fw-bold text-truncate">{task.clients.name}</span>
                                                                </div>
                                                            )}
                                                            {task.equipments && (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <Wrench size={14} className="text-muted" />
                                                                    <span className="x-small fw-bold text-truncate">{task.equipments.brand} {task.equipments.model}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2">
                                                    <div className="x-small text-muted fw-semibold">
                                                        <span>CRIADA EM: {new Date(task.created_at).toLocaleDateString('pt-PT')}</span><br />
                                                        <span className="text-secondary opacity-75">CRIADA POR: {task.creator?.first_name || 'Desconhecido'} {task.creator?.last_name || ''}</span>
                                                        {task.completed && task.completed_at && (
                                                            <><br /><span className="text-success">CONCLUÍDA EM: {new Date(task.completed_at).toLocaleDateString('pt-PT')}</span></>
                                                        )}
                                                    </div>
                                                    <div className="d-flex gap-1">
                                                        <button className={`btn btn-sm ${task.completed ? 'btn-success text-white' : 'btn-outline-success'} border-0`} onClick={(e) => { e.stopPropagation(); handleToggleCompletion(task); }} title={task.completed ? "Marcar como pendente" : "Marcar como concluída"}>
                                                            <Check size={18} />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-warning border-0" onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Editar Tarefa">
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger border-0" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} title="Eliminar Tarefa">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                onTaskSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
                    queryClient.invalidateQueries({ queryKey: ['schedules'] });
                }}
            />

            <style>{`
                .priority-strip {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                }
                .hover-lift {
                    transition: all 0.2s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 1rem 3rem rgba(0,0,0,0.1) !important;
                }
                .avatar-xs {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.65rem;
                    font-weight: bold;
                }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .x-small { font-size: 0.7rem; }
                .text-indigo { color: #6610f2; }
            `}</style>
        </div>
    );
};

export default TasksPage;
