import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { ScheduleEvent } from '../types'; // Importar o tipo centralizado
import ScheduleDetailModal from '../components/ScheduleDetailModal';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [view, setView] = useState<any>('month');
  const [date, setDate] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const fetchSchedules = () => {
    apiClient.get('/schedules').then(response => {
      const schedules = response.data.map((schedule: any) => ({
        ...schedule,
        start: new Date(schedule.startDate),
        end: new Date(schedule.endDate),
      }));
      setEvents(schedules);
    });
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSelectEvent = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleScheduleChange = () => {
    fetchSchedules(); // Recarregar eventos após uma alteração
  };

  return (
    <div className="container mt-4">
      <ScheduleDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        onScheduleUpdated={handleScheduleChange}
        onScheduleDeleted={handleScheduleChange}
      />

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent as (event: object) => void} // Cast para evitar conflito de tipo
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda"
        }}
      />
    </div>
  );
};

export default CalendarPage;