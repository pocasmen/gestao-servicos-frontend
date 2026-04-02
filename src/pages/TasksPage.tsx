import React, { useState, useMemo, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, Clock, Lock, Globe, Filter, AlertTriangle, Calendar as CalendarIcon, Trash2, Building2, Wrench, Pencil, Check } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import logger from '../utils/logger';
import { InternalTask } from '../types';
import { AuthContext } from '../contexts/AuthContext';

const TasksPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm, alert } = useConfirm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<InternalTask | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const { user: currentUser } = useContext(AuthContext);
    const [showOnlyMine, setShowOnlyMine] = useState(false);

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
            end.setDate(start.getDate() + 4);
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

    const navigateDate = (direction: number) => {
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
        }
        return dateRange.start.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    }, [dateRange, viewMode]);

    const { data: tasks, isLoading, isError, error } = useQuery({
        queryKey: ['internal-tasks'],
        queryFn: async () => {
            const response = await apiClient.get('/api/tasks');
            return response.data;
        }
    });

    const location = useLocation();

    // Deteção de abertura automática via Dashboard
    useEffect(() => {
        if (tasks && location.state?.taskToEditId) {
            const taskId = Number(location.state.taskToEditId);
            const task = tasks.find((t: InternalTask) => t.id === taskId);
            if (task) {
                // Se a tarefa estiver concluída mas o filtro estiver em 'pending', 
                // mudamos o filtro para 'all' ou 'completed' para garantir visibilidade (opcional)
                if (task.completed && statusFilter === 'pending') {
                    setStatusFilter('all');
                }
                
                handleEdit(task);
                // Limpar o estado para não reabrir ao navegar internamente
                window.history.replaceState({}, document.title);
            }
        }
    }, [tasks, location.state, statusFilter]);

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/tasks/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['internal-tasks'] }),
        onError: (err: any) => { logger.error(err); alert('Não foi possível eliminar a tarefa.'); }
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
        onError: (err: any) => { logger.error(err); alert('Não foi possível atualizar o estado da tarefa.'); }
    });

    const handleEdit = (task: InternalTask) => { setSelectedTask(task); setIsModalOpen(true); };
    const handleCreate = () => { setSelectedTask(null); setIsModalOpen(true); };
    const handleDelete = async (id: number) => {
        if (await confirm({ title: 'Eliminar Tarefa', message: 'Tem a certeza que deseja eliminar esta tarefa permanentemente?', variant: 'danger', confirmText: 'Eliminar' })) {
            deleteMutation.mutate(id);
        }
    };
    const handleToggleCompletion = (task: InternalTask) => toggleCompletionMutation.mutate(task);

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = { event: 'Evento', training: 'Formação', webinar: 'Webinário', vacation: 'Folga/Férias', admin: 'Administrativo', other: 'Outro' };
        return labels[type] || type;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'secondary';
        }
    };

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((t: InternalTask) => {
            if (statusFilter === 'pending' && t.completed) return false;
            if (statusFilter === 'completed' && !t.completed) return false;
            if (showOnlyMine && t.user_id !== currentUser?.id) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            const { start, end } = dateRange;
            const hasBlocks = t.internal_task_time_blocks && t.internal_task_time_blocks.length > 0;
            if (hasBlocks) return t.internal_task_time_blocks!.some(b => { const s = new Date(b.start_time); return s >= start && s <= end; });
            return new Date(t.created_at) >= start && new Date(t.created_at) <= end;
        });
    }, [tasks, statusFilter, filterType, dateRange, showOnlyMine, currentUser?.id]);

    const stats = useMemo(() => {
        if (!tasks) return { total: 0, pending: 0, completed: 0 };
        const inRange = tasks.filter((t: InternalTask) => {
            if (showOnlyMine && t.user_id !== currentUser?.id) return false;
            const { start, end } = dateRange;
            const hasBlocks = t.internal_task_time_blocks && t.internal_task_time_blocks.length > 0;
            if (hasBlocks) return t.internal_task_time_blocks!.some(b => { const s = new Date(b.start_time); return s >= start && s <= end; });
            return new Date(t.created_at) >= start && new Date(t.created_at) <= end;
        });
        return { total: inRange.length, pending: inRange.filter((t: any) => !t.completed).length, completed: inRange.filter((t: any) => t.completed).length };
    }, [tasks, dateRange, showOnlyMine, currentUser?.id]);

    return (
        <div className="container-fluid py-4 px-4 animate__animated animate__fadeIn" style={{ minHeight: 'calc(100vh - 100px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h1 className="h2 fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: '#0f172a' }}>Tarefas Internas</h1>
                    <p className="text-muted small m-0 fst-italic">Gestão administrativa, formação e eventos de equipa.</p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="bg-white rounded-4 shadow-sm d-flex align-items-center gap-2 border border-light px-3 py-2">
                        <div className="btn-group btn-group-sm me-2">
                            <button className={`btn rounded-pill px-3 fw-bold ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-secondary border-0'}`} onClick={() => setViewMode('week')}>Semana</button>
                            <button className={`btn rounded-pill px-3 fw-bold ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-secondary border-0'}`} onClick={() => setViewMode('month')}>Mês</button>
                        </div>
                        <button className="btn btn-icon btn-outline-secondary border-0 rounded-circle" onClick={() => navigateDate(-1)}><i className="bi bi-chevron-left"></i></button>
                        <span className="fw-bold small text-capitalize text-dark" style={{ minWidth: '170px', textAlign: 'center' }}>{rangeLabel}</span>
                        <button className="btn btn-icon btn-outline-secondary border-0 rounded-circle" onClick={() => navigateDate(1)}><i className="bi bi-chevron-right"></i></button>
                        <button className="btn btn-sm btn-light fw-bold ms-1 rounded-pill px-3" onClick={() => setBaseDate(new Date())}>Hoje</button>
                    </div>
                    <button className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-4 fw-bold shadow-sm" onClick={handleCreate}>
                        <Plus size={18} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="d-flex gap-3 mb-4 flex-wrap">
                {[
                    { label: 'Por Concluir', value: stats.pending, color: 'info', icon: <Clock size={16} className="text-info" /> },
                    { label: 'Concluídas', value: stats.completed, color: 'success', icon: <Check size={16} className="text-success" /> },
                    { label: 'Total no Período', value: stats.total, color: 'primary', icon: <Filter size={16} className="text-primary" /> },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-pill shadow-sm d-flex align-items-center px-4 py-2 gap-3 border border-light">
                        <div className={`rounded-circle d-flex align-items-center justify-content-center bg-${s.color} bg-opacity-15`} style={{ width: 36, height: 36 }}>{s.icon}</div>
                        <div>
                            <div className="fw-bold fs-5 text-dark lh-1">{s.value}</div>
                            <div className="small text-muted">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Task List */}
            <div className="glass-card border-0 shadow-lg overflow-hidden animate__animated animate__fadeInUp" style={{ borderRadius: '24px' }}>
                {/* Dark Toolbar */}
                <div className="bg-dark px-4 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Listagem de Tarefas</h5>
                        <select className="form-select form-select-sm rounded-pill border-0 shadow-none fw-bold" style={{ width: 'auto', minWidth: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="pending">Por Concluir</option>
                            <option value="completed">Concluídas</option>
                            <option value="all">Todos os Estados</option>
                        </select>
                        <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox" id="filterMyTasks" checked={showOnlyMine} onChange={e => setShowOnlyMine(e.target.checked)} />
                            <label className="form-check-label small fw-bold text-white-50" htmlFor="filterMyTasks" style={{ cursor: 'pointer' }}>Apenas as minhas</label>
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {['all', 'event', 'training', 'webinar', 'vacation', 'admin'].map(type => (
                            <button key={type} className={`btn btn-sm px-3 rounded-pill fw-semibold ${filterType === type ? 'btn-primary' : 'btn-outline-light border-0 text-white-50'}`} onClick={() => setFilterType(type)}>
                                {type === 'all' ? 'Todos' : getTypeLabel(type)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-light bg-opacity-50">
                    {isLoading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">A carregar tarefas...</p>
                        </div>
                    ) : isError ? (
                        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-3 p-4 rounded-4">
                            <AlertTriangle size={24} /> <div><strong>Erro:</strong> {(error as any).message}</div>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
                            <div className="opacity-25 mb-3"><Plus size={48} /></div>
                            <h5 className="text-muted mb-3">Nenhuma tarefa encontrada</h5>
                            <button className="btn btn-primary px-4 py-2 rounded-pill fw-bold shadow-sm" onClick={handleCreate}>Criar Primeira Tarefa</button>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {filteredTasks.map((task: InternalTask) => {
                                const color = getPriorityColor(task.priority);
                                return (
                                    <div key={task.id} className="col-12 col-md-6 col-xxl-4">
                                        <div
                                            className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden bg-white"
                                            onClick={() => handleEdit(task)}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1rem 3rem rgba(0,0,0,0.1)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                                        >
                                            <div className={`bg-${color}`} style={{ height: 5 }}></div>
                                            <div className="card-body p-4 pt-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <span className="badge rounded-pill bg-light text-primary border px-2 py-1 fw-bold mb-2 d-inline-block" style={{ fontSize: '0.65rem' }}>
                                                            {getTypeLabel(task.type)}
                                                        </span>
                                                        <h5 className="card-title fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>{task.title}</h5>
                                                    </div>
                                                    <div className="d-flex gap-2 opacity-75 ms-2 flex-shrink-0">
                                                        {task.is_private ? <Lock size={14} className="text-warning" /> : <Globe size={14} className="text-success" />}
                                                        {task.show_on_calendar && <CalendarIcon size={14} style={{ color: '#6610f2' }} />}
                                                    </div>
                                                </div>

                                                <p className="card-text text-muted small mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.5rem' }}>
                                                    {task.description}
                                                </p>

                                                <div className="d-flex flex-column gap-2 py-3 border-top border-bottom">
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <label className="text-muted fw-bold d-block mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Responsável</label>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="rounded" style={{ width: 24, height: 24, backgroundColor: task.assignee?.color || '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: '#fff' }}>
                                                                    {task.assignee?.first_name?.[0]}{task.assignee?.last_name?.[0]}
                                                                </div>
                                                                <span className="small fw-semibold">{task.assignee?.first_name} {task.assignee?.last_name?.[0]}.</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="text-muted fw-bold d-block mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Duração</label>
                                                            <div className="d-flex align-items-center gap-1 text-primary small fw-bold">
                                                                <Clock size={14} />
                                                                <span>{task.estimated_hours || 0}h</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(task.clients || task.equipments) && (
                                                        <div className="bg-light p-2 rounded-3">
                                                            {task.clients && <div className="d-flex align-items-center gap-2 mb-1"><Building2 size={13} className="text-muted" /><span className="small fw-bold text-truncate">{task.clients.name}</span></div>}
                                                            {task.equipments && <div className="d-flex align-items-center gap-2"><Wrench size={13} className="text-muted" /><span className="small fw-bold text-truncate">{task.equipments.brand} {task.equipments.model}</span></div>}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center mt-3">
                                                    <div style={{ fontSize: '0.68rem' }} className="text-muted lh-sm">
                                                        {task.creator && (
                                                            <div className="mb-1 fw-bold text-uppercase opacity-75">
                                                                POR: {task.creator.first_name} {task.creator.last_name}
                                                            </div>
                                                        )}
                                                        <span>CRIADA EM: {new Date(task.created_at).toLocaleDateString('pt-PT')}</span>
                                                        {task.completed && task.completed_at && <><br /><span className="text-success fw-bold">CONCLUÍDA EM: {new Date(task.completed_at).toLocaleDateString('pt-PT')}</span></>}
                                                    </div>
                                                    <div className="d-flex gap-1">
                                                        <button className={`btn btn-icon rounded-circle border-0 shadow-sm ${task.completed ? 'btn-success' : 'btn-outline-success'}`} onClick={e => { e.stopPropagation(); handleToggleCompletion(task); }} title={task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}>
                                                            <Check size={16} />
                                                        </button>
                                                        <button className="btn btn-icon btn-outline-warning rounded-circle border-0 shadow-sm" onClick={e => { e.stopPropagation(); handleEdit(task); }} title="Editar Tarefa">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button className="btn btn-icon btn-outline-danger rounded-circle border-0 shadow-sm" onClick={e => { e.stopPropagation(); handleDelete(task.id); }} title="Eliminar Tarefa">
                                                            <Trash2 size={16} />
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
        </div>
    );
};

export default TasksPage;
