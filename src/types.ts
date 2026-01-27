import { Event as BigCalendarEvent } from 'react-big-calendar';

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
  acknowledgementState?: 'pending' | 'accepted' | 'rejected';
  parts?: PartItem[]; // Adicionado
  clientName?: string;
  equipmentInfo?: string;
  timeBlocks?: TimeBlock[];
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
  status: 'open' | 'scheduled' | 'closed' | 'deleted';
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



}







export interface PartItem {







  id?: number;







  quantity: number;







  reference: string;







  designation: string;







  isDesignationLocked?: boolean;







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
  // Campos preenchidos por JOINs para a visualização do relatório
  clientName?: string;
  clientAddress?: string;
  clientNif?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentSerialNumber?: string;
  timeBlocks?: TimeBlock[];
}

