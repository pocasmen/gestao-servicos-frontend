import { Event as BigCalendarEvent } from 'react-big-calendar';

// Interface para o evento do calendário, estendendo o tipo base
export interface ScheduleEvent extends BigCalendarEvent {
  id: number;
  title: string; // Garantir que o título é uma string
  clientId: number;
  equipmentId: number;
  technicianId: number;
  // O `title` já vem do BigCalendarEvent como string opcional
  // `start` e `end` também já vêm
}

// Outras interfaces partilhadas
export interface Client {
  id: number;
  name: string;
}

export interface Equipment {
  id: number;
  brand: string;
  model: string;
}

export interface Technician {
  id: number;
  name: string;
}
