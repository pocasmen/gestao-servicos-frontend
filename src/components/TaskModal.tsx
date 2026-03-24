import React, { useState, useEffect, useRef, useContext } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Trash2, Plus, Clock, Lock, Globe, Calendar as CalendarIcon, User as UserIcon, Building2, Wrench, CheckCircle, Check } from 'lucide-react';
import apiClient from '../apiClient';
import logger from '../utils/logger';
import { useConfirm } from '../contexts/ConfirmContext';
import { InternalTask, Client, Equipment, Technician } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../constants/enums';

registerLocale('pt', pt);

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onTaskSaved: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onTaskSaved }) => {
    const { user: currentUser } = useContext(AuthContext);
    const { alert } = useConfirm();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('other');
    const [priority, setPriority] = useState('medium');
    const [clientId, setClientId] = useState<number | null>(null);
    const [equipmentId, setEquipmentId] = useState<number | null>(null);
    const [assignedUserId, setAssignedUserId] = useState<string>('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [showOnCalendar, setShowOnCalendar] = useState(false);
    const [timeBlocks, setTimeBlocks] = useState<{ start_time: Date; end_time: Date }[]>([]);
    const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [clients, setClients] = useState<Client[]>([]);
    const [clientSearch, setClientSearch] = useState('');
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    const [showClientSearch, setShowClientSearch] = useState(false);
    const [showEquipmentSelect, setShowEquipmentSelect] = useState(false);

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);

    // Auto-grow textareas
    useEffect(() => {
        [titleRef, descRef].forEach(ref => {
            if (ref.current) {
                ref.current.style.height = 'auto';
                ref.current.style.height = `${ref.current.scrollHeight}px`;
            }
        });
    }, [title, description, isOpen]);

    useEffect(() => {
        apiClient.get('/api/clients').then(res => setClients(res.data)).catch(err => logger.error(err));
        apiClient.get('/api/technicians').then(res => {
            setTechnicians((res.data || []).filter((t: any) =>
                t.role === UserRole.TECHNICIAN || t.role === UserRole.ADMIN || t.role === UserRole.SUPER_ADMIN || t.role === UserRole.OFFICE_STAFF
            ));
        }).catch(err => logger.error(err));
    }, []);

    useEffect(() => {
        if (clientId) {
            apiClient.get(`/api/clients/${clientId}/equipments`)
                .then(res => setEquipments(res.data))
                .catch(err => logger.error(err));
        } else {
            setEquipments([]);
            setEquipmentId(null);
            // Don't auto-hide if just typing, but maybe if cleared? 
            // User said "seleccionar o cliente deve aparecer um botao"
        }
    }, [clientId]);

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setType(task.type || 'other');
            setPriority(task.priority || 'medium');
            setClientId(task.client_id || null);
            setEquipmentId(task.equipment_id || null);
            setAssignedUserId(task.user_id || '');
            setIsPrivate(task.is_private !== undefined ? task.is_private : false);
            setShowOnCalendar(task.show_on_calendar || false);
            setEstimatedHours(task.estimated_hours || null);
            setIsCompleted(task.completed || false);
            setCompletedAt(task.completed_at || null);

            if (task.client_id) {
                setShowClientSearch(true);
                // Need to wait for clients to load to set search term accurately, 
                // but task might already have client name via join? 
                // Actually InternalTask has clients: { name }
                if (task.clients?.name) setClientSearch(task.clients.name);
            } else {
                setShowClientSearch(false);
                setClientSearch('');
            }

            if (task.equipment_id) {
                setShowEquipmentSelect(true);
            } else {
                setShowEquipmentSelect(false);
            }

            if (task.time_blocks && task.time_blocks.length > 0) {
                setTimeBlocks(task.time_blocks.map((tb: any) => ({
                    start_time: new Date(tb.start_time),
                    end_time: new Date(tb.end_time)
                })));
            } else if (task.timeBlocks && task.timeBlocks.length > 0) {
                // Fallback for when it comes via the schedule mapper
                setTimeBlocks(task.timeBlocks.map((tb: any) => ({
                    start_time: new Date(tb.start),
                    end_time: new Date(tb.end)
                })));
            } else {
                setTimeBlocks([]);
            }
        } else {
            resetForm();
        }
    }, [task, isOpen, clients]);

    // Sync clientId with clientSearch
    useEffect(() => {
        if (clientSearch && clients.length > 0) {
            const selectedClient = clients.find(c => c.name.toLowerCase() === clientSearch.toLowerCase().trim());
            if (selectedClient) {
                setClientId(selectedClient.id);
            } else {
                setClientId(null);
            }
        } else {
            setClientId(null);
        }
    }, [clientSearch, clients]);

    // Recalculate estimated hours
    useEffect(() => {
        if (timeBlocks.length > 0) {
            let total = 0;
            timeBlocks.forEach(tb => {
                const diff = tb.end_time.getTime() - tb.start_time.getTime();
                if (diff > 0) total += diff / (1000 * 60 * 60);
            });
            setEstimatedHours(Math.round(total * 100) / 100);
        }
    }, [timeBlocks]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('other');
        setPriority('medium');
        setClientId(null);
        setEquipmentId(null);
        setAssignedUserId(currentUser?.id || '');
        setIsPrivate(false);
        setShowOnCalendar(false);
        setTimeBlocks([]);
        setEstimatedHours(null);
        setIsCompleted(false);
        setCompletedAt(null);
        setShowClientSearch(false);
        setShowEquipmentSelect(false);
        setClientSearch('');
    };

    const handleAddBlock = () => {
        const now = new Date();
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        setTimeBlocks([...timeBlocks, { start_time: now, end_time: end }]);
    };

    const handleRemoveBlock = (index: number) => {
        setTimeBlocks(timeBlocks.filter((_, i) => i !== index));
    };

    const handleBlockChange = (index: number, field: 'start_time' | 'end_time', value: Date | null) => {
        if (!value) return;
        const newBlocks = [...timeBlocks];
        newBlocks[index] = { ...newBlocks[index], [field]: value };
        setTimeBlocks(newBlocks);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !priority || !assignedUserId) {
            await alert('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        const payload = {
            title,
            description,
            type,
            priority,
            user_id: assignedUserId,
            client_id: clientId,
            equipment_id: equipmentId,
            is_private: isPrivate,
            show_on_calendar: showOnCalendar,
            timeBlocks: timeBlocks.map(tb => ({
                start_time: tb.start_time.toISOString(),
                end_time: tb.end_time.toISOString()
            })),
            completed: isCompleted,
            completed_at: isCompleted && !completedAt ? new Date().toISOString() : (!isCompleted ? null : completedAt)
        };

        setIsSubmitting(true);
        try {
            if (task?.id) {
                await apiClient.patch(`/api/tasks/${task.id}`, payload);
            } else {
                await apiClient.post('/api/tasks', payload);
            }
            onTaskSaved();
            onClose();
        } catch (err) {
            logger.error(err);
            await alert('Ocorreu um erro ao guardar a tarefa.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal show fade" tabIndex={-1} style={{ display: 'block' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <form onSubmit={handleSave}>
                        <div className="modal-header">
                            <h5 className="modal-title">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <div className="row mb-3">
                                {/* Título */}
                                <div className="col-md-8">
                                    <div className="form-group">
                                        <label className="text-secondary fw-bold">Título *</label>
                                        <textarea
                                            ref={titleRef}
                                            className="form-control"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            rows={1}
                                            placeholder="O que precisa de ser feito?"
                                            required
                                            style={{ resize: 'none' }}
                                        />
                                    </div>
                                </div>
                                {/* Atribuição */}
                                <div className="col-md-4">
                                    <div className="form-group">
                                        <label className="text-secondary fw-bold">Atribuído a *</label>
                                        <select
                                            className="form-control"
                                            value={assignedUserId}
                                            onChange={(e) => setAssignedUserId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione um técnico...</option>
                                            {technicians.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Descrição */}
                            <div className="form-group mb-3">
                                <label className="text-secondary fw-bold">Descrição *</label>
                                <textarea
                                    ref={descRef}
                                    className="form-control"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes adicionais..."
                                    required
                                    style={{ resize: 'none' }}
                                ></textarea>
                            </div>

                            <div className="row mb-3">
                                {/* Tipo */}
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label className="text-secondary fw-bold">Tipo de Tarefa</label>
                                        <select
                                            className="form-control"
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                        >
                                            <option value="event">Evento</option>
                                            <option value="training">Formação</option>
                                            <option value="webinar">Webinário</option>
                                            <option value="vacation">Folga/Férias</option>
                                            <option value="admin">Administrativo</option>
                                            <option value="other">Outro</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Prioridade */}
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label className="text-secondary fw-bold">Prioridade</label>
                                        <select
                                            className={`form-select priority-select-${priority}`}
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            required
                                        >
                                            <option value="low" style={{ color: '#0dcaf0' }}>Baixa</option>
                                            <option value="medium" style={{ color: '#fd7e14' }}>Média</option>
                                            <option value="high" style={{ color: '#dc3545' }}>Alta</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Cliente e Equipamento */}
                            <div className="mb-3">
                                <div className="d-flex gap-2 mb-2">
                                    {!showClientSearch && (
                                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShowClientSearch(true)}>
                                            <Building2 size={14} className="me-1" /> Adicionar Cliente
                                        </button>
                                    )}
                                    {clientId && !showEquipmentSelect && (
                                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShowEquipmentSelect(true)}>
                                            <Wrench size={14} className="me-1" /> Adicionar Equipamento
                                        </button>
                                    )}
                                </div>

                                <div className="row g-2">
                                    {showClientSearch && (
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label className="text-secondary fw-bold">Cliente</label>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control"
                                                        list="taskClientOptions"
                                                        value={clientSearch}
                                                        onChange={e => setClientSearch(e.target.value)}
                                                        placeholder="Pesquisar cliente..."
                                                    />
                                                    <button type="button" className="btn btn-outline-danger" onClick={() => { setShowClientSearch(false); setClientSearch(''); setClientId(null); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <datalist id="taskClientOptions">
                                                    {clients.map(c => <option key={c.id} value={c.name} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                    )}

                                    {showEquipmentSelect && clientId && (
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label className="text-secondary fw-bold">Equipamento</label>
                                                <div className="input-group">
                                                    <select
                                                        className="form-control"
                                                        value={equipmentId || ''}
                                                        onChange={e => setEquipmentId(e.target.value ? Number(e.target.value) : null)}
                                                    >
                                                        <option value="">Selecione um equipamento...</option>
                                                        {equipments.map(eq => (
                                                            <option key={eq.id} value={eq.id}>
                                                                {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`.trim()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button type="button" className="btn btn-outline-danger" onClick={() => { setShowEquipmentSelect(false); setEquipmentId(null); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Configurações de exibição */}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <div className="form-check form-switch border p-2 rounded bg-light">
                                        <input
                                            className="form-check-input ms-0 me-2"
                                            type="checkbox"
                                            id="isPrivateSwitch"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                        />
                                        <label className="form-check-label fw-bold" htmlFor="isPrivateSwitch">
                                            {isPrivate ? 'Privada' : 'Pública'}
                                        </label>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-check form-switch border p-2 rounded bg-light">
                                        <input
                                            className="form-check-input ms-0 me-2"
                                            type="checkbox"
                                            id="calendarSwitch"
                                            checked={showOnCalendar}
                                            onChange={(e) => setShowOnCalendar(e.target.checked)}
                                        />
                                        <label className="form-check-label fw-bold" htmlFor="calendarSwitch">
                                            No Calendário
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Blocos de Tempo */}
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="text-secondary fw-bold m-0 d-flex align-items-center gap-2">
                                        <Clock size={18} /> Agendamento e Horários
                                    </label>
                                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={handleAddBlock}>
                                        <Plus size={16} className="me-1" /> Adicionar Bloco
                                    </button>
                                </div>

                                <div className="d-flex flex-column gap-2">
                                    {timeBlocks.length === 0 ? (
                                        <div className="text-center py-3 bg-light rounded border border-dashed text-muted small">
                                            Nenhum horário definido para esta tarefa.
                                        </div>
                                    ) : (
                                        timeBlocks.map((block, index) => (
                                            <div key={index} className="p-3 bg-white border rounded d-flex align-items-center gap-3">
                                                <div className="flex-grow-1">
                                                    <label className="text-muted small fw-bold mb-1 d-block">Início</label>
                                                    <DatePicker
                                                        selected={block.start_time}
                                                        onChange={(date) => handleBlockChange(index, 'start_time', date)}
                                                        showTimeSelect
                                                        dateFormat="Pp"
                                                        locale="pt"
                                                        className="form-control form-control-sm border-0 p-0 fw-bold bg-transparent"
                                                    />
                                                </div>
                                                <div className="flex-grow-1 border-start ps-3">
                                                    <label className="text-muted small fw-bold mb-1 d-block">Fim</label>
                                                    <DatePicker
                                                        selected={block.end_time}
                                                        onChange={(date) => handleBlockChange(index, 'end_time', date)}
                                                        showTimeSelect
                                                        dateFormat="Pp"
                                                        locale="pt"
                                                        className="form-control form-control-sm border-0 p-0 fw-bold bg-transparent"
                                                    />
                                                </div>
                                                <button type="button" className="btn btn-outline-danger btn-sm border-0" onClick={() => handleRemoveBlock(index)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {estimatedHours !== null && timeBlocks.length > 0 && (
                                <div className="text-end">
                                    <div className="d-inline-flex px-3 py-1 bg-primary bg-opacity-10 border border-primary border-opacity-10 rounded">
                                        <span className="text-primary fw-bold small">TOTAL ESTIMADO: {estimatedHours}h</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer d-flex justify-content-between align-items-center">
                            <div>
                                {task && (
                                    <button
                                        type="button"
                                        className={`btn ${isCompleted ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-2`}
                                        onClick={() => {
                                            const checked = !isCompleted;
                                            setIsCompleted(checked);
                                            if (checked && !completedAt) {
                                                setCompletedAt(new Date().toISOString());
                                            } else if (!checked) {
                                                setCompletedAt(null);
                                            }
                                        }}
                                        title={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                                    >
                                        <Check size={18} />
                                        {isCompleted ? 'Concluída' : 'Concluir'}
                                    </button>
                                )}
                            </div>
                            <div>
                                <button type="button" className="btn btn-secondary me-2" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            {task ? 'A guardar...' : 'A criar...'}
                                        </>
                                    ) : (task ? 'Guardar' : 'Criar')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <style>{`
                    .priority-select-high { color: #dc3545 !important; font-weight: bold; }
                    .priority-select-medium { color: #fd7e14 !important; font-weight: bold; }
                    .priority-select-low { color: #0dcaf0 !important; font-weight: bold; }
                `}</style>
        </div>
    );
};

export default TaskModal;
