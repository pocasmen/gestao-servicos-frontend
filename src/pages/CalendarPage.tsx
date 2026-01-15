import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { pt } from 'date-fns/locale';
import apiClient from '../apiClient';
import { supabase } from '../supabase';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarPage.css';

import { ScheduleEvent, Report, Ticket } from '../types';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import ReportModal from '../components/ReportModal';

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
  allDay: 'Dia Inteiro', previous: 'Anterior', next: 'Próximo', today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento',
};

const calendarViews = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [dirtyEventIds, setDirtyEventIds] = useState<Set<string | number>>(new Set());

  const location = useLocation();
  const navigate = useNavigate();

  const serviceTypeLabels: Record<string, string> = {
    reparacao: 'Reparação',
    instalacao: 'Instalação',
    assistencia: 'Assistência',
    manutencao: 'Manutenção',
    remota: 'Remota',
  };

  const fetchSchedules = useCallback(() => {
    apiClient.get('/api/schedules').then(response => {
      const fetchedEvents: ScheduleEvent[] = [];

      response.data.forEach((schedule: any) => {
        const serviceLabel = serviceTypeLabels[schedule.serviceType] || schedule.serviceType || 'Serviço';
        const equipLabel = schedule.equipmentInfo || 'Mod. Desconhecido';
        const clientLabel = schedule.clientName || 'Cliente Desconhecido';
        const title = `${serviceLabel} - ${equipLabel} - ${clientLabel}`;

        const baseEvent = {
          ...schedule,
          scheduleId: schedule.id,
          title,
        };

        if (schedule.timeBlocks && schedule.timeBlocks.length > 0) {
          schedule.timeBlocks.forEach((tb: any, index: number) => {
            fetchedEvents.push({
              ...baseEvent,
              id: tb.id ? `blk_${tb.id}` : `s${schedule.id}_idx${index}`, // Unique ID for calendar
              // Store DB block id if available, handled via virtual ID for now
              start: new Date(tb.start),
              end: new Date(tb.end),
            });
          });
        } else {
          fetchedEvents.push({
            ...baseEvent,
            id: schedule.id,
            start: new Date(schedule.startDate),
            end: new Date(schedule.endDate),
          });
        }
      });
      setEvents(fetchedEvents);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleManageReport = useCallback(async (event: ScheduleEvent) => {
    handleCloseModal();
    setSelectedEvent(event);
    const numericId = event.scheduleId || (typeof event.id === 'number' ? event.id : undefined);
    if (!numericId) {
      alert("Não foi possível identificar o agendamento associado.");
      return;
    }
    try {
      const response = await apiClient.get<Report>(`/api/reports/by-schedule/${numericId}`);
      setReportToEdit(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setReportToEdit(null);
      } else {
        console.error("Erro ao verificar relatório existente:", error);
        alert("Não foi possível verificar o relatório do serviço.");
        return;
      }
    }
    setIsReportModalOpen(true);
  }, [handleCloseModal]);

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
      const eventToEdit = events.find(e => e.id === scheduleToEditId);
      if (eventToEdit) {
        setSelectedEvent(eventToEdit);
        setIsModalOpen(true);
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else if (ticketToReport) {
      const scheduleEvent = events.find(e => (e.scheduleId === (ticketToReport as Ticket).scheduleId) || (e.id === (ticketToReport as Ticket).scheduleId));
      if (scheduleEvent) {
        handleManageReport(scheduleEvent);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, navigate, events, handleManageReport]);

  const handleEventDrop = useCallback(({ event, start, end, isAllDay }: any) => {
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end } : e));
    setDirtyEventIds(prev => new Set(prev).add(event.id));
  }, []);

  const handleEventResize = useCallback(({ event, start, end }: any) => {
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end } : e));
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

  const handleScheduleUpdated = useCallback((savedSchedule?: ScheduleEvent) => {
    fetchSchedules();
    handleCloseModal();
  }, [fetchSchedules, handleCloseModal]);

  // Real-time synchronization using Broadcast (fast) and Postgres Changes (backup)
  useEffect(() => {
    console.log('[DEBUG:REALTIME] Iniciando monitorização em tempo real...');

    const channel = supabase
      .channel('calendar_updates')
      // 1. Ouvir via Broadcast (Enviado manualmente pelo servidor para rapidez total)
      .on('broadcast', { event: 'schedule_changed' }, (payload) => {
        console.log('[DEBUG:REALTIME] Mensagem Broadcast recebida:', payload);
        fetchSchedules();
      })
      // 2. Ouvir via Postgres Changes (Caso a tabela tenha Realtime ativo no dashboard)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          console.log('[DEBUG:REALTIME] Postgres Change detetada (schedules):', payload);
          fetchSchedules();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_technicians' },
        (payload) => {
          console.log('[DEBUG:REALTIME] Postgres Change detetada (technicians):', payload);
          fetchSchedules();
        }
      )
      .subscribe((status, err) => {
        console.log(`[DEBUG:REALTIME] Status da subscrição: ${status}`, err || '');
      });

    return () => {
      console.log('[DEBUG:REALTIME] A limpar subscrição...');
      supabase.removeChannel(channel);
    };
  }, [fetchSchedules]);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setSelectedEvent(null);
    setReportToEdit(null);
  }, []);

  const handleReportSaved = useCallback(() => {
    fetchSchedules();
    handleCloseReportModal();
  }, [fetchSchedules, handleCloseReportModal]);

  const handleSaveAll = useCallback(async () => {
    if (dirtyEventIds.size === 0) return;

    if (!window.confirm(`Tem a certeza que quer guardar alterações em ${dirtyEventIds.size} bloco(s)?`)) {
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
      const times = scheduleEvents.flatMap(e => [e.start.getTime(), e.end.getTime()]);
      const minTime = new Date(Math.min(...times));
      const maxTime = new Date(Math.max(...times));

      // 4. Construct payload
      const baseEvent = scheduleEvents[0];

      const timeBlocks = scheduleEvents.map(e => ({
        start: e.start.toISOString(),
        end: e.end.toISOString()
      }));

      const payload = {
        ...baseEvent,
        startDate: minTime.toISOString(),
        endDate: maxTime.toISOString(),
        technicianIds: baseEvent.technicians ? baseEvent.technicians.map((t: any) => t.id) : [],
        timeBlocks
      };

      // Cleanup payload
      // @ts-ignore
      delete payload.technicians;
      // @ts-ignore
      delete payload.scheduleId;
      // @ts-ignore
      delete payload.id;
      // @ts-ignore
      delete payload.timeBlocks_raw; // just in case

      return apiClient.put(`/api/schedules/${schId}`, payload);
    });

    try {
      await Promise.all(updatePromises);
      alert('Alterações guardadas com sucesso!');
    } catch (error) {
      console.error("Erro ao guardar alterações:", error);
      alert('Ocorreu um erro ao guardar as alterações.');
    } finally {
      setDirtyEventIds(new Set());
      fetchSchedules();
    }
  }, [events, dirtyEventIds, fetchSchedules]);

  const handleCancelAll = useCallback(() => {
    if (window.confirm('Tem a certeza que quer descartar todas as alterações?')) {
      setDirtyEventIds(new Set());
      fetchSchedules();
    }
  }, [fetchSchedules]);

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleView = useCallback((newView: any) => setView(newView), []);

  const eventStyleGetter = useCallback((event: ScheduleEvent) => {
    let style: React.CSSProperties = {
      borderRadius: '5px',
      opacity: 0.9, // Aumentar opacidade para melhor impacto visual das cores
      color: 'white',
      border: '0px',
      display: 'block',
      boxShadow: 'none',
      transition: 'all 0.2s ease-in-out',
      // Opção: Sombra Suave (Drop Shadow) - Mais elegante que o outline
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    };

    // Lógica para Cores com Múltiplos Técnicos (Listras Diagonais)
    if (event.technicians && event.technicians.length > 0) {
      if (event.technicians.length === 1) {
        // Apenas um técnico: cor sólida
        style.backgroundColor = event.technicians[0].color || '#3174ad';
      } else {
        // Múltiplos técnicos: Listras diagonais
        const stripeWidth = 20; // Largura das listras em px
        // Gerar o gradiente
        // Padrão: Cor1 0px, Cor1 20px, Cor2 20px, Cor2 40px, ...

        let gradientStops = [];
        for (let i = 0; i < event.technicians.length; i++) {
          const tech = event.technicians[i];
          const color = tech.color || '#3174ad';
          const start = i * stripeWidth;
          const end = (i + 1) * stripeWidth;
          gradientStops.push(`${color} ${start}px`);
          gradientStops.push(`${color} ${end}px`);
        }

        // Construir a string do gradiente repetitivo
        // Para que se repita corretamente, precisamos percorrer todos os técnicos e depois o 'repeating' cuida do resto
        // Mas o repeating-linear-gradient aceita comprimentos.
        // Ex: repeating-linear-gradient(45deg, A 0, A 20px, B 20px, B 40px);

        const stops = event.technicians.map((t, idx) => {
          const c = t.color || '#3174ad';
          return `${c} ${idx * stripeWidth}px, ${c} ${(idx + 1) * stripeWidth}px`;
        }).join(', ');

        style.backgroundImage = `repeating-linear-gradient(45deg, ${stops})`;
      }
    } else {
      style.backgroundColor = '#3174ad'; // Default se não houver técnicos
    }

    if (event.isCompleted) {
      if (event.hasReport) {
        return { className: 'event-with-report' };
      }
      return { className: 'event-completed' };
    }

    // Adiciona um feedback visual para o estado de confirmação
    const rawState = (event.acknowledgementState || (event as any).acknowledgmentState || (event as any).acknowledgementstate || 'pending').toLowerCase();

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
    <div className="container mt-4 calendar-container">
      {dirtyEventIds.size > 0 && (
        <div className="floating-toolbar">
          <span>Tem {dirtyEventIds.size} alteração(ões) por guardar.</span>
          <button className="btn btn-primary btn-sm ms-3" onClick={handleSaveAll}>Guardar Alterações</button>
          <button className="btn btn-secondary btn-sm ms-2" onClick={handleCancelAll}>Cancelar</button>
        </div>
      )}
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        selectable
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        defaultView={Views.WEEK}
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
