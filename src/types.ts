import { Event as BigCalendarEvent } from 'react-big-calendar';
import { UserRole, TicketStatus, ScheduleStatus, StockType } from './constants/enums';

export interface ScheduleEvent {
  id: number | string;
  scheduleId?: number; // Real DB ID if 'id' is virtual
  title: string;
  start: Date;
  end: Date;
  clientId: number;
  equipmentId: number;
  technicians: Technician[]; // Changed from technicianId
  isCompleted: boolean;
  hasReport: boolean;
  ticketId?: number;
  internalNotes?: string;
  serviceType?: string;
  acknowledgementState?: ScheduleStatus.PENDING | ScheduleStatus.ACCEPTED | ScheduleStatus.REJECTED;
  parts?: PartItem[]; // Adicionado
  clientName?: string;
  equipmentInfo?: string;
  timeBlocks?: TimeBlock[];
  includes_travel?: boolean; // Indica se o serviço inclui deslocação
}

export interface TimeBlock {
  id?: number;
  start: Date;
  end: Date;
}



export interface Client {



  id: number;



  name: string;



  address: string;



  nif: string;



  contactName?: string;



  contactEmail?: string;



  contactPhone?: string;



}







export interface Equipment {



  id: number;



  brand: string;



  model: string;



  serialNumber: string;



  clientId: number;



}







export interface Technician {







  id: string; // Changed from number to string for UUID







  name: string;







  color: string;
  signature?: string;
}















export interface User {







  id: number;






  client_id: number;






  email: string;







}















export interface Ticket {
  id: number;
  client_id: number;
  equipmentId: number;
  title: string;
  faultDescription: string;
  status: TicketStatus;
  scheduleId?: number;
  createdAt: string;
  updatedAt: string;
  created_by_user_id?: string;
  // Campos preenchidos por JOINs
  clientName?: string;
  equipmentInfo?: string;
  userFirstName?: string;
  userLastName?: string;
  // Campos do agendamento associado
  startDate?: string;
  endDate?: string;
  internalNotes?: string;
  hasReport?: boolean;
}















export interface Part {
  id?: number;
  reference: string;
  designation: string;
  is_composed?: boolean;
  stock_quantity?: number;
  reserved_quantity?: number;
  ordered_quantity?: number;
  stock_quantity_contract?: number;
  reserved_quantity_contract?: number;
  ordered_quantity_contract?: number;
}







export interface PartItem {
  id?: number;
  quantity: number;
  reference: string;
  designation: string;
  isDesignationLocked?: boolean;
  stockType?: StockType;
  isApplied?: boolean;
  stock_quantity?: number;
  reserved_quantity?: number;
  stock_quantity_contract?: number;
  reserved_quantity_contract?: number;
}







export interface Report {
  id?: number;
  report_number?: number | string;
  clientId: number;
  equipmentId: number;
  scheduleId?: number;
  technicians: Technician[];
  serviceDate: string;
  hours: number;
  parts: PartItem[];
  description: string;
  serviceType: string[];
  damage?: string;
  internalNotes?: string;
  signature?: string; // Campo para armazenar a assinatura em Base64 ou URL
  technician_signature?: string; // Assinatura do técnico no momento do relatório
  includes_travel?: boolean; // Indica se o serviço incluiu deslocação
  // Campos preenchidos por JOINs para a visualização do relatório
  clientName?: string;
  clientAddress?: string;
  clientNif?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentSerialNumber?: string;
  timeBlocks?: TimeBlock[];
}

