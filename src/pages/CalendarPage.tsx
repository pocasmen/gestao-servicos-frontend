import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../contexts/ConfirmContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { pt } from 'date-fns/locale';
import apiClient from '../apiClient';
import { supabase } from '../supabase';
import logger from '../utils/logger';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarPage.css';

import { ScheduleEvent, Report, Ticket, Technician } from '../types';
import { ScheduleEventSchema } from '../schemas';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import ReportModal from '../components/ReportModal';
import { SERVICE_TYPE_LABELS, SCHEDULE_PRIORITY_LABELS } from '../constants';
import { ScheduleStatus, SchedulePriority } from '../constants/enums';

const locales = { 'pt-PT': pt };

const customFormats = {
  dateFormat: 'dd/MM/yyyy',
  dayFormat: 'dd/MM/yyyy',
  weekdayFormat: 'EEE',
  monthHeaderFormat: 'MMMM yyyy',
  dayHeaderFormat: 'EEE dd/MM',
  weekHeaderFormat: 'MMM dd',
  dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) =>
    format(start, 'dd/MM/yyyy', { locale: pt }) + ' - ' + format(end, 'dd/MM/yyyy', { locale: pt }),
  agendaDateFormat: 'dd/MM/yyyy',
  agendaDayFormat: 'dd/MM/yyyy',
  agendaHeaderFormat: ({ start, end }: { start: Date, end: Date }) =>
    format(start, 'dd/MM/yyyy', { locale: pt }) + ' - ' + format(end, 'dd/MM/yyyy', { locale: pt }),
  agendaTimeFormat: 'HH:mm',
  agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) =>
    format(start, 'HH:mm', { locale: pt }) + ' - ' + format(end, 'HH:mm', { locale: pt }),
  eventTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) =>
    format(start, 'HH:mm', { locale: pt }) + ' - ' + format(end, 'HH:mm', { locale: pt }),
  eventTimeRangeStartFormat: ({ start }: { start: Date }) =>
    format(start, 'HH:mm', { locale: pt }) + ' - ',
  eventTimeRangeEndFormat: ({ end }: { end: Date }) =>
    ' - ' + format(end, 'HH:mm', { locale: pt }),
  timeGutterFormat: 'HH:mm',
};

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales, formats: customFormats });
const DragAndDropCalendar = withDragAndDrop<ScheduleEvent>(Calendar);

const messages = {
  allDay: 'Dia Inteiro', previous: 'Anterior', next: 'Próximo', today: 'Hoje', month: 'Mês', week: 'Semana', work_week: 'Semana', day: 'Dia', agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento',
};

const calendarViews = [Views.MONTH, Views.WORK_WEEK, Views.DAY, Views.AGENDA];

const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { confirm: contextConfirm, alert: contextAlert } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.WORK_WEEK);
  const [dirtyEventIds, setDirtyEventIds] = useState<Set<string | number>>(new Set());
  const [showOnlyMyBacklog, setShowOnlyMyBacklog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draggedItemMetadata, setDraggedItemMetadata] = useState<ScheduleEvent | null>(null);
  const [backlogSortMode, setBacklogSortMode] = useState<'date' | 'priority'>('priority');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Queries
  const { data: rawSchedules = [], refetch: fetchSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await apiClient.get('/api/schedules');
      return response.data.data || [];
    }
  });

  const processedSchedules = useMemo(() => {
    const fetchedEvents: ScheduleEvent[] = [];
    const fetchedBacklog: ScheduleEvent[] = [];

    rawSchedules.forEach((item: unknown) => {
      const result = ScheduleEventSchema.safeParse(item);
      if (!result.success) {
        logger.error(result.error.format(), '[SCHEMA_ERROR] Invalid schedule data received:');
        return;
      }

      const schedule = result.data;
      const stArray = Array.isArray(schedule.serviceType) ? schedule.serviceType : (schedule.serviceType ? [schedule.serviceType] : []);
      const serviceLabel = stArray.map(t => SERVICE_TYPE_LABELS[t] || t).join(', ') || 'Serviço';
      const equipLabel = schedule.equipmentInfo || 'Mod. Desconhecido';
      const clientLabel = schedule.clientName || 'Cliente Desconhecido';
      const title = `${serviceLabel} - ${equipLabel} - ${clientLabel}`;

      const baseEvent = {
        ...schedule,
        id: schedule.id,
        scheduleId: schedule.scheduleId || (typeof schedule.id === 'number' ? schedule.id : undefined),
        title,
        start: schedule.startDate ? new Date(schedule.startDate) : undefined,
        end: schedule.endDate ? new Date(schedule.endDate) : undefined,
        technicians: schedule.technicians || [],
      } as ScheduleEvent;

      const isUnscheduled = schedule.acknowledgementState === ScheduleStatus.PENDING_SCHEDULING || !schedule.startDate;

      if (isUnscheduled) {
        fetchedBacklog.push(baseEvent);
      } else if (schedule.timeBlocks && schedule.timeBlocks.length > 0) {
        schedule.timeBlocks.forEach((tb, index: number) => {
          fetchedEvents.push({
            ...baseEvent,
            id: tb.id ? `blk_${tb.id}` : `s${schedule.id}_idx${index}`,
            start: new Date(tb.start),
            end: new Date(tb.end),
          });
        });
      } else {
        fetchedEvents.push({
          ...baseEvent,
          id: schedule.id,
          start: schedule.startDate ? new Date(schedule.startDate) : undefined,
          end: schedule.endDate ? new Date(schedule.endDate) : undefined,
        } as ScheduleEvent);
      }
    });

    return { events: fetchedEvents, backlog: fetchedBacklog };
  }, [rawSchedules]);

  const [eventsState, setEvents] = useState<ScheduleEvent[]>([]);

  // We sync eventsState with processedSchedules only when rawSchedules changes
  // to allow local updates (drag/resize) to persist until save.
  useEffect(() => {
    setEvents(processedSchedules.events);
  }, [processedSchedules.events]);

  const events = eventsState;
  const backlog = processedSchedules.backlog;

  const filteredBacklog = useMemo(() => {
    return backlog
      .filter(item => !showOnlyMyBacklog || (item.technicians && item.technicians.some(t => t.id === currentUserId)))
      .sort((a, b) => {
        if (backlogSortMode === 'date') {
          const aDate = new Date(a.id as number).getTime();
          const bDate = new Date(b.id as number).getTime();
          return aDate - bDate;
        } else {
          const priorityOrder = { [SchedulePriority.HIGH]: 0, [SchedulePriority.MEDIUM]: 1, [SchedulePriority.LOW]: 2 };
          const aPriority = a.priority || SchedulePriority.MEDIUM;
          const bPriority = b.priority || SchedulePriority.MEDIUM;

          if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
            return priorityOrder[aPriority] - priorityOrder[bPriority];
          }

          const aDate = new Date(a.id as number).getTime();
          const bDate = new Date(b.id as number).getTime();
          return aDate - bDate;
        }
      });
  }, [backlog, showOnlyMyBacklog, currentUserId, backlogSortMode]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleManageReport = useCallback(async (event: ScheduleEvent) => {
    handleCloseModal();
    setSelectedEvent(event);
    const numericId = event.scheduleId || (typeof event.id === 'number' ? event.id : undefined);
    if (!numericId) {
      await contextAlert("Não foi possível identificar o agendamento associado.");
      return;
    }
    try {
      const response = await apiClient.get<Report>(`/api/reports/by-schedule/${numericId}`);
      setReportToEdit(response.data);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number } };
        if (axiosError.response.status === 404) {
          setReportToEdit(null);
          // 404 means no report exists, so we proceed to open modal in "Create" mode
          // Do not return here.
        } else {
          // For other errors, we might want to stop or alert
          logger.error(error, "Erro ao verificar relatório existente:");
          await contextAlert("Não foi possível verificar o relatório do serviço.");
          return; // Stop if it's a non-404 error?
        }
      } else {
        logger.error(error, "Erro desconhecido ao verificar relatório:");
        await contextAlert("Não foi possível verificar o relatório do serviço.");
        return;
      }
    }
    setIsReportModalOpen(true);
  }, [handleCloseModal, contextAlert]);

  // Efeito para lidar com o agendamento de um NOVO ticket vindo de outra página
  useEffect(() => {
    const { ticketToSchedule } = location.state || {};

    if (ticketToSchedule) {
      const now = new Date();
      const t = ticketToSchedule as Ticket;
      const extractTitle = (fd: string) => {
        const line = (fd || '').split('\n').find(l => l.trim().startsWith('[Título]'));
        return line ? line.replace(/^\[Título\]\s*/, '').trim() : (fd || '').trim();
      };
      const newEvent: ScheduleEvent = {
        id: 0,
        title: '', // Será gerado dinamicamente no map se recarregado, mas para o modal usamos vazio
        start: now,
        end: addHours(now, 1),
        clientId: t.client_id,
        equipmentId: t.equipmentId,
        technicians: [],
        isCompleted: false,
        hasReport: false,
        ticketId: t.id,
        serviceType: 'remota',
        clientName: t.clientName,
        equipmentInfo: t.equipmentInfo,
      };
      setSelectedEvent(newEvent);
      setIsModalOpen(true);
      // Limpar o estado para não reabrir o modal em re-renderizações
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Efeito para lidar com EDIÇÃO ou RELATÓRIO de um agendamento existente
  useEffect(() => {
    // Não fazer nada se os eventos ainda não foram carregados
    if (events.length === 0) return;

    const { scheduleToEditId, ticketToReport } = location.state || {};

    if (scheduleToEditId) {
      const eventToEdit = events.find(e => e.id === scheduleToEditId || e.scheduleId === scheduleToEditId);
      if (eventToEdit) {
        setSelectedEvent(eventToEdit);
        setIsModalOpen(true);
        if (eventToEdit.start) setDate(eventToEdit.start);
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else if (ticketToReport) {
      const scheduleEvent = events.find(e => (e.scheduleId === (ticketToReport as Ticket).scheduleId) || (e.id === (ticketToReport as Ticket).scheduleId));
      if (scheduleEvent) {
        handleManageReport(scheduleEvent);
        if (scheduleEvent.start) setDate(scheduleEvent.start);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, navigate, events, handleManageReport]);

  const handleEventDrop = useCallback(({ event, start, end }: { event: ScheduleEvent, start: string | Date, end: string | Date }) => {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start: s, end: e } : ev));
    setDirtyEventIds(prev => new Set(prev).add(event.id));
  }, []);

  const handleEventResize = useCallback(({ event, start, end }: { event: ScheduleEvent, start: string | Date, end: string | Date }) => {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start: s, end: e } : ev));
    setDirtyEventIds(prev => new Set(prev).add(event.id));
  }, []);

  const handleSelectEvent = useCallback((event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date, end: Date }) => {
    setSelectedEvent({ id: 0, title: '', start, end, clientId: 0, equipmentId: 0, technicians: [], isCompleted: false, hasReport: false, clientName: '', equipmentInfo: '' });
    setIsModalOpen(true);
  }, []);

  const onDropFromOutside = useCallback(({ start, end, allDay }: any) => {
    if (draggedItemMetadata) {
      setSelectedEvent({
        ...draggedItemMetadata,
        start,
        end: addHours(start, 1),
      });
      setIsModalOpen(true);
      setDraggedItemMetadata(null);
    }
  }, [draggedItemMetadata]);

  const handleDragStart = useCallback((item: ScheduleEvent) => {
    setDraggedItemMetadata(item);
  }, []);

  const dragFromOutsideItem = useCallback(() => {
    return draggedItemMetadata || {} as ScheduleEvent;
  }, [draggedItemMetadata]);

  const handleBacklogClick = (item: ScheduleEvent) => {
    setSelectedEvent({
      ...item,
      start: new Date(), // Default to now if clicking
      end: addHours(new Date(), 1)
    });
    setIsModalOpen(true);
  };

  const handleScheduleUpdated = useCallback((savedSchedule?: ScheduleEvent) => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    handleCloseModal();
  }, [queryClient, handleCloseModal]);

  // Real-time synchronization using Broadcast (fast) and Postgres Changes (backup)
  useEffect(() => {
    logger.debug('[DEBUG:REALTIME] Iniciando monitorização em tempo real...');

    const channel = supabase
      .channel('calendar_updates')
      // 1. Ouvir via Broadcast (Enviado manualmente pelo servidor para rapidez total)
      .on('broadcast', { event: 'schedule_changed' }, (payload) => {
        logger.debug(payload, '[DEBUG:REALTIME] Mensagem Broadcast recebida:');
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      })
      // 2. Ouvir via Postgres Changes (Caso a tabela tenha Realtime ativo no dashboard)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          logger.debug(payload, '[DEBUG:REALTIME] Postgres Change detetada (schedules):');
          queryClient.invalidateQueries({ queryKey: ['schedules'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_technicians' },
        (payload) => {
          logger.debug(payload, '[DEBUG:REALTIME] Postgres Change detetada (technicians):');
          queryClient.invalidateQueries({ queryKey: ['schedules'] });
        }
      )
      .subscribe((status, err) => {
        logger.debug({ err }, `[DEBUG:REALTIME] Status da subscrição: ${status}`);
      });

    return () => {
      logger.debug('[DEBUG:REALTIME] A limpar subscrição...');
      supabase.removeChannel(channel);
    };
  }, [fetchSchedules]);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setSelectedEvent(null);
    setReportToEdit(null);
  }, []);

  const handleReportSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    handleCloseReportModal();
  }, [queryClient, handleCloseReportModal]);

  const handleSaveAll = useCallback(async () => {
    if (dirtyEventIds.size === 0) return;

    if (!await contextConfirm({
      message: `Tem a certeza que quer guardar alterações em ${dirtyEventIds.size} bloco(s)?`,
      title: 'Guardar Alterações',
      confirmText: 'Guardar'
    })) {
      return;
    }

    // 1. Identify distinct schedules that need update
    const dirtyScheduleIds = new Set<number>();
    dirtyEventIds.forEach(id => {
      const ev = events.find(e => e.id === id);
      if (ev) {
        // Use scheduleId if available (for virtual events), or fallback to id (for legacy/single events)
        const realId = ev.scheduleId !== undefined ? ev.scheduleId : (typeof ev.id === 'number' ? ev.id : Number(ev.id));
        dirtyScheduleIds.add(realId);
      }
    });

    const updatePromises = Array.from(dirtyScheduleIds).map(schId => {
      // 2. Gather all blocks for this schedule
      const scheduleEvents = events.filter(e => (e.scheduleId === schId) || (e.id === schId));

      if (scheduleEvents.length === 0) return Promise.resolve();

      // 3. Calculate Min/Max for the parent schedule container
      const times = scheduleEvents.flatMap(e => [e.start?.getTime() || 0, e.end?.getTime() || 0]);
      const minTime = new Date(Math.min(...times.filter(t => t > 0)));
      const maxTime = new Date(Math.max(...times.filter(t => t > 0)));

      // 4. Construct payload
      const baseEvent = scheduleEvents[0];
      if (!baseEvent) return Promise.resolve();

      const timeBlocks = scheduleEvents.map(e => ({
        start: e.start?.toISOString() || '',
        end: e.end?.toISOString() || ''
      }));

      const { technicians, scheduleId: _sId, id: _id, ...baseEventRest } = baseEvent;
      // Note: timeBlocks_raw is not in ScheduleEvent interface, so if it exists on runtime object we might need to ignore it, 
      // but strictly typing suggests we should only destructure known props.
      // If timeBlocks_raw comes from API but isn't in type, it won't be in baseEventRest if we strictly typed it? 
      // Actually spread of object includes everything. 
      // Let's rely on baseEventRest which now excludes technicans, scheduleId, id.

      const payload = {
        ...baseEventRest,
        startDate: minTime.toISOString(),
        endDate: maxTime.toISOString(),
        technicianIds: baseEvent.technicians ? baseEvent.technicians.map(t => t.id) : [],
        timeBlocks
      };

      return apiClient.put(`/api/schedules/${schId}`, payload);
    });

    try {
      await Promise.all(updatePromises);
      await contextAlert('Alterações guardadas com sucesso!', 'Sucesso');
    } catch (error) {
      logger.error(error, "Erro ao guardar alterações:");
      await contextAlert('Ocorreu um erro ao guardar as alterações.');
    } finally {
      setDirtyEventIds(new Set());
      fetchSchedules();
    }
  }, [events, dirtyEventIds, fetchSchedules, contextConfirm, contextAlert]);

  const handleCancelAll = useCallback(async () => {
    if (await contextConfirm({
      message: 'Tem a certeza que quer descartar todas as alterações?',
      title: 'Cancelar Alterações',
      variant: 'warning',
      confirmText: 'Descartar'
    })) {
      setDirtyEventIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  }, [fetchSchedules, contextConfirm, queryClient]);

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleView = useCallback((newView: any) => setView(newView), []);

  // Helper memoizado para gerar gradientes, evitando recálculos no render
  const getTechnicianGradient = useCallback((technicians: Technician[]) => {
    const stripeWidth = 20;
    const stops = technicians.map((t, idx) => {
      const c = t.color || '#3174ad';
      return `${c} ${idx * stripeWidth}px, ${c} ${(idx + 1) * stripeWidth}px`;
    }).join(', ');
    return `repeating-linear-gradient(45deg, ${stops})`;
  }, []);

  const eventStyleGetter = useCallback((event: ScheduleEvent) => {
    let style: React.CSSProperties = {
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      boxShadow: 'none',
      transition: 'all 0.2s ease-in-out',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    };

    if (event.technicians && event.technicians.length > 0) {
      if (event.technicians.length === 1) {
        style.backgroundColor = event.technicians[0].color || '#3174ad';
      } else {
        style.backgroundImage = getTechnicianGradient(event.technicians);
      }
    } else {
      style.backgroundColor = '#3174ad';
    }

    if (event.isCompleted) {
      if (event.hasReport) {
        return { className: 'event-with-report' };
      }
      return { className: 'event-completed' };
    }

    // Adiciona um feedback visual para o estado de confirmação
    const rawState = (event.acknowledgementState || 'pending').toLowerCase();

    switch (rawState) {
      case 'accepted':
        style.border = '4px solid #28a745'; // Verde para aceite
        style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.5)';
        style.opacity = 1;
        break;
      case 'rejected':
        style.border = '4px solid #dc3545'; // Vermelho para rejeitado
        style.backgroundColor = '#6c757d'; // Cinzento
        style.boxShadow = '0 0 5px rgba(220, 53, 69, 0.5)';
        break;
      case 'pending':
        style.border = '4px solid #ffc107'; // Amarelo para pendente
        style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.6)';
        break;
      default:
        // Se não tiver estado, colocar uma borda subtil para consistência
        style.border = '1px solid rgba(255,255,255,0.3)';
        break;
    }

    // Adiciona um feedback visual para alterações não guardadas
    if (dirtyEventIds.has(event.id)) {
      style.boxShadow = '0 0 10px 3px rgba(255, 100, 0, 0.7)'; // Brilho laranja
    }

    return { style };
  }, [dirtyEventIds]);

  return (
    <div className="container-fluid mt-4 calendar-container">
      {dirtyEventIds.size > 0 && (
        <div className="floating-toolbar">
          <span>Tem {dirtyEventIds.size} alteração(ões) por guardar.</span>
          <button className="btn btn-primary btn-sm ms-3" onClick={handleSaveAll}>Guardar Alterações</button>
          <button className="btn btn-secondary btn-sm ms-2" onClick={handleCancelAll}>Cancelar</button>
        </div>
      )}
      <div className="row">
        <div className="col-md-3 backlog-sidebar">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Serviços Pendentes</h6>
              <span className="badge bg-primary">{backlog.length}</span>
            </div>
            <div className="card-body p-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="filterMyBacklog"
                  checked={showOnlyMyBacklog}
                  onChange={(e) => setShowOnlyMyBacklog(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="filterMyBacklog">
                  Apenas os meus
                </label>
              </div>
              <div className="btn-group btn-group-sm w-100 mb-2" role="group">
                <button
                  type="button"
                  className={`btn ${backlogSortMode === 'date' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setBacklogSortMode('date')}
                >
                  Por Data
                </button>
                <button
                  type="button"
                  className={`btn ${backlogSortMode === 'priority' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setBacklogSortMode('priority')}
                >
                  Por Prioridade
                </button>
              </div>

              {filteredBacklog
                .map(item => (
                  <div
                    key={item.id}
                    className="card mb-2 backlog-item shadow-none border position-relative"
                    onClick={() => handleBacklogClick(item)}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    style={{
                      cursor: 'grab',
                      overflow: 'hidden'
                    }}
                  >
                    <div className={`priority-strip bg-${(item.priority || SchedulePriority.MEDIUM) === SchedulePriority.HIGH ? 'danger' :
                      (item.priority || SchedulePriority.MEDIUM) === SchedulePriority.LOW ? 'secondary' :
                        'warning'
                      }`}></div>
                    <div className="card-body p-2 pt-3">
                      <div className="small fw-bold text-truncate" title={item.clientName}>{item.clientName}</div>
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div className="small text-muted text-truncate" title={item.equipmentInfo}>
                          {item.equipmentInfo}
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                          <span className="badge bg-light text-dark border p-1" style={{ fontSize: '0.6rem', lineHeight: 1, whiteSpace: 'normal', textAlign: 'left', wordBreak: 'break-word', maxWidth: '100px' }} title={Array.isArray(item.serviceType) ? item.serviceType.map(t => SERVICE_TYPE_LABELS[t] || t).join(', ') : (SERVICE_TYPE_LABELS[item.serviceType || ''] || item.serviceType)}>
                            {Array.isArray(item.serviceType)
                              ? (item.serviceType.length > 1
                                ? item.serviceType.map(t => (SERVICE_TYPE_LABELS[t] || t).substring(0, 3)).join(', ')
                                : item.serviceType.map(t => SERVICE_TYPE_LABELS[t] || t).join(', '))
                              : (SERVICE_TYPE_LABELS[item.serviceType || ''] || item.serviceType)}
                          </span>
                          <div className="d-flex ms-1">
                            {item.technicians?.map(t => (
                              <div
                                key={t.id}
                                className="rounded-circle ms-n1"
                                style={{ width: '10px', height: '10px', backgroundColor: t.color, border: '1px solid white' }}
                                title={t.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="col-md-9">
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            resizable
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onDropFromOutside={onDropFromOutside}
            dragFromOutsideItem={dragFromOutsideItem}
            defaultView={Views.WORK_WEEK}
            views={calendarViews}
            culture="pt-PT"
            messages={messages}
            eventPropGetter={eventStyleGetter}
            date={date}
            view={view}
            onNavigate={handleNavigate}
            onView={handleView}
            min={new Date(new Date().setHours(8, 0, 0, 0))}
            max={new Date(new Date().setHours(20, 0, 0, 0))}
          />
        </div>
      </div>
      {isModalOpen && (
        <ScheduleDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
          onScheduleUpdated={handleScheduleUpdated}
          onManageReport={handleManageReport}
        />
      )}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          schedule={selectedEvent}
          reportToEdit={reportToEdit}
          onReportSaved={handleReportSaved}
        />
      )}
    </div>
  );
};

export default CalendarPage;
