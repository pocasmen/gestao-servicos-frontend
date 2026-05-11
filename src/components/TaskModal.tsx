import React, { useState, useEffect, useRef, useContext } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Trash2, Plus, Clock, Lock, Globe, Calendar as CalendarIcon, User as UserIcon, Building2, Wrench, CheckCircle, Check, ShieldAlert } from 'lucide-react';
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
        if (isOpen && clients.length === 0) {
            apiClient.get('/api/clients').then(res => setClients(res.data)).catch(err => logger.error(err));
        }
        if (isOpen && technicians.length === 0) {
            apiClient.get('/api/technicians').then(res => {
                setTechnicians((res.data || []).filter((t: any) =>
                    t.role === UserRole.TECHNICIAN || t.role === UserRole.ADMIN || t.role === UserRole.SUPER_ADMIN || t.role === UserRole.OFFICE_STAFF
                ));
            }).catch(err => logger.error(err));
        }
    }, [isOpen]);

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
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
            <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn w-100" style={{ maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
                            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        {clientId && clients.find(c => Number(c.id) === Number(clientId))?.is_blacklisted && (
                            <div className="alert border-0 shadow-lg rounded-4 mb-4 animate__animated animate__shakeX d-flex align-items-center gap-3 p-3"
                                style={{ 
                                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                    boxShadow: '0 10px 25px rgba(192, 57, 43, 0.3)',
                                    borderLeft: '6px solid #922b21'
                                }}>
                                <div className="bg-white rounded-circle p-2 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style={{ width: '50px', height: '50px' }}>
                                    <ShieldAlert size={28} style={{ color: '#c0392b' }} strokeWidth={2.5} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="alert-heading fw-bolder m-0 text-white text-uppercase" style={{ fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                                        CLIENTE EM BLACK LIST
                                    </h6>
                                    <p className="m-0 text-white fw-bold small opacity-90">
                                        Restrições financeiras ativas. Evitar novos serviços.
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="row g-3 mb-3">
                                {/* Título */}
                                <div className="col-md-8">
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                        <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            <i className="bi bi-fonts me-2 text-primary opacity-50"></i>
                                            Título *
                                        </label>
                                        <textarea
                                            ref={titleRef}
                                            className="form-control form-control-sm border-light bg-light rounded-4 px-3 py-2 shadow-none fw-medium"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            rows={1}
                                            placeholder="O que precisa de ser feito?"
                                            required
                                            style={{ resize: 'none', overflow: 'hidden' }}
                                        />
                                    </div>
                                </div>
                                {/* Atribuição */}
                                <div className="col-md-4">
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                        <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            <i className="bi bi-person-fill me-2 text-primary opacity-50"></i>
                                            Atribuído a *
                                        </label>
                                        <select
                                            className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
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
                            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3">
                                <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                    <i className="bi bi-card-text me-2 text-primary opacity-50"></i>
                                    Descrição *
                                </label>
                                <textarea
                                    ref={descRef}
                                    className="form-control form-control-sm border-light bg-light rounded-4 px-3 py-2 shadow-none fw-medium"
                                    rows={1}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes adicionais..."
                                    required
                                    style={{ resize: 'none', overflow: 'hidden' }}
                                ></textarea>
                            </div>

                            <div className="row mb-3">
                                {/* Tipo */}
                                <div className="col-md-6">
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                        <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            <i className="bi bi-tag-fill me-2 text-primary opacity-50"></i>
                                            Tipo de Tarefa
                                        </label>
                                        <select
                                            className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
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
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                        <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                            <i className="bi bi-flag-fill me-2 text-primary opacity-50"></i>
                                            Prioridade
                                        </label>
                                        <select
                                            className={`form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium priority-select-${priority}`}
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
                                            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                                <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                    <i className="bi bi-building-fill me-2 text-primary opacity-50"></i>
                                                    Cliente
                                                </label>
                                                <div className="input-group input-group-sm">
                                                    <input
                                                        className="form-control border-light bg-light rounded-start-pill px-3 py-2 shadow-none fw-medium"
                                                        list="taskClientOptions"
                                                        value={clientSearch}
                                                        onChange={e => setClientSearch(e.target.value)}
                                                        placeholder="Pesquisar cliente..."
                                                    />
                                                    <button type="button" className="btn btn-outline-danger border-light rounded-end-pill px-3" onClick={() => { setShowClientSearch(false); setClientSearch(''); setClientId(null); }}>
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
                                            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                                                <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                    <i className="bi bi-tools me-2 text-primary opacity-50"></i>
                                                    Equipamento
                                                </label>
                                                <div className="input-group input-group-sm">
                                                    <select
                                                        className="form-select border-light bg-light rounded-start-pill px-3 py-2 shadow-none fw-medium"
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
                                                    <button type="button" className="btn btn-outline-danger border-light rounded-end-pill px-3" onClick={() => { setShowEquipmentSelect(false); setEquipmentId(null); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Configurações de exibição */}
                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm h-100 d-flex align-items-center">
                                        <div className="form-check form-switch w-100 d-flex align-items-center mb-0 p-0">
                                            <label className="text-dark fw-bold text-uppercase d-flex align-items-center m-0 flex-grow-1" htmlFor="isPrivateSwitch" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                <i className="bi bi-lock-fill me-2 text-primary opacity-50"></i>
                                                {isPrivate ? 'Tarefa Privada' : 'Tarefa Pública'}
                                            </label>
                                            <input
                                                className="form-check-input ms-0 me-2"
                                                type="checkbox"
                                                id="isPrivateSwitch"
                                                checked={isPrivate}
                                                onChange={(e) => setIsPrivate(e.target.checked)}
                                                style={{ width: '2.5rem', height: '1.25rem', marginTop: 0 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm h-100 d-flex align-items-center">
                                        <div className="form-check form-switch w-100 d-flex align-items-center mb-0 p-0">
                                            <label className="text-dark fw-bold text-uppercase d-flex align-items-center m-0 flex-grow-1" htmlFor="calendarSwitch" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                                <i className="bi bi-calendar-check-fill me-2 text-primary opacity-50"></i>
                                                Visível no Calendário
                                            </label>
                                            <input
                                                className="form-check-input ms-0 me-2"
                                                type="checkbox"
                                                id="calendarSwitch"
                                                checked={showOnCalendar}
                                                onChange={(e) => setShowOnCalendar(e.target.checked)}
                                                style={{ width: '2.5rem', height: '1.25rem', marginTop: 0 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Blocos de Tempo */}
                            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <label className="text-dark fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                                        <Clock size={16} className="me-2 text-primary opacity-50 d-inline" /> 
                                        Agendamento e Horários
                                    </label>
                                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-bold border-2 d-flex align-items-center gap-1" onClick={handleAddBlock} style={{ fontSize: '0.75rem' }}>
                                        <Plus size={14} /> Adicionar
                                    </button>
                                </div>

                                <div className="d-flex flex-column gap-2">
                                    {timeBlocks.length === 0 ? (
                                        <div className="text-center py-3 bg-light rounded border border-dashed text-muted small">
                                            Nenhum horário definido para esta tarefa.
                                        </div>
                                    ) : (
                                        timeBlocks.map((block, index) => (
                                            <div key={index} className="p-3 bg-light rounded-4 border border-light d-flex align-items-center gap-3">
                                                <div className="flex-grow-1">
                                                    <label className="text-muted small fw-bold mb-1 d-block text-uppercase" style={{ fontSize: '0.7rem' }}>Início</label>
                                                    <DatePicker
                                                        selected={block.start_time}
                                                        onChange={(date) => handleBlockChange(index, 'start_time', date)}
                                                        showTimeSelect
                                                        dateFormat="Pp"
                                                        locale="pt"
                                                        className="form-control form-control-sm border-0 p-0 fw-bold bg-transparent shadow-none"
                                                    />
                                                </div>
                                                <div className="flex-grow-1 border-start ps-3 border-light">
                                                    <label className="text-muted small fw-bold mb-1 d-block text-uppercase" style={{ fontSize: '0.7rem' }}>Fim</label>
                                                    <DatePicker
                                                        selected={block.end_time}
                                                        onChange={(date) => handleBlockChange(index, 'end_time', date)}
                                                        showTimeSelect
                                                        dateFormat="Pp"
                                                        locale="pt"
                                                        className="form-control form-control-sm border-0 p-0 fw-bold bg-transparent shadow-none"
                                                    />
                                                </div>
                                                <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveBlock(index)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {estimatedHours !== null && timeBlocks.length > 0 && (
                                <div className="text-end mt-3 border-top border-light pt-3">
                                    <div className="d-inline-flex px-3 py-1 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-pill shadow-sm">
                                        <span className="text-primary fw-bold text-uppercase d-flex align-items-center" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                            <i className="bi bi-hourglass-split me-2"></i>
                                            Estimativa: {estimatedHours}h
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    <div className="px-4 py-3 bg-light bg-opacity-50 border-top d-flex justify-content-between align-items-center gap-2 flex-wrap">
                            <div className="d-flex align-items-center gap-3">
                                {task && (
                                    <button
                                        type="button"
                                        className={`btn ${isCompleted ? 'btn-success' : 'btn-outline-success border-0'} d-flex align-items-center gap-2 rounded-pill px-3 fw-medium mb-1`}
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
                                {task && task.created_at && (
                                    <div className="text-muted d-flex flex-column justify-content-center" style={{ fontSize: '0.7rem' }}>
                                        <div className="fw-bold d-flex align-items-center gap-1 mb-1" title="Criado por">
                                            <UserIcon size={12} className="opacity-75" />
                                            <span>
                                                {technicians.find(t => t.id === task.created_by)?.name || 
                                                 task.users?.name || 
                                                 'Sistema / Desconhecido'}
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-1 opacity-75" title="Data de criação">
                                            <CalendarIcon size={12} />
                                            <span>{new Date(task.created_at).toLocaleString('pt-PT')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="d-flex gap-2 justify-content-end">
                                <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                                    {isSubmitting ? (task ? 'A guardar...' : 'A criar...') : (task ? 'Guardar Tarefa' : 'Criar Tarefa')}
                                </button>
                            </div>
                        </div>
                    </form>
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
