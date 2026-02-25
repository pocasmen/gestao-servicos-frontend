import { UserRole, TicketStatus, ScheduleStatus, StockType, ServiceClassification, SchedulePriority } from './constants/enums';

export interface DashboardStats {
  tickets: {
    open: number;
    scheduled: number;
    closed: number;
  };
  weekly: {
    total: number;
    completed: number;
    withReport: number;
  };
  overdue: number;
  pendingReports: {
    total: number;
    completed: number;
    overdue: number;
  };
}

export enum BillingStatus {
  PENDING_COMPLETION = 'pending_completion',
  REPORT_ISSUED = 'report_issued',
  READY_FOR_BILLING = 'ready_for_billing',
  BILLED = 'billed'
}

export interface BillingTask {
  id: number;
  report_id: number;
  status: BillingStatus;
  assigned_role: UserRole;
  notes?: string;
  billing_notes?: string;
  billed_at?: string;
  created_at: string;
  updated_at: string;
  reports?: Report;
}

export interface ScheduleEvent {
  id: number | string;
  scheduleId?: number; // Real DB ID if 'id' is virtual
  title: string;
  start?: Date;
  end?: Date;
  clientId: number;
  equipmentId: number;
  status?: ScheduleStatus;
  technicians: Technician[]; // Changed from technicianId
  isCompleted: boolean;
  hasReport: boolean;
  ticketId?: number;
  internalNotes?: string;
  serviceType?: string;
  acknowledgementState?: ScheduleStatus;
  parts?: PartItem[]; // Adicionado
  clientName?: string;
  equipmentInfo?: string;
  timeBlocks?: TimeBlock[];
  includes_travel?: boolean; // Indica se o serviço inclui deslocação
  classification?: ServiceClassification;
  priority?: SchedulePriority;
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
  city?: string;
  postCode?: string;
}







export interface Attachment {
  id: string;
  ticket_id: number;
  file_name: string;
  mime_type: string;
  storage_path: string;
  uploaded_by_user_id: string;
  created_at: string;
  url: string;
}

export interface TicketResponse {
  id: number;
  ticket_id: number;
  user_id?: string;
  technician_id?: string;
  authorName?: string;
  message: string;
  created_at: string;
  role?: string;
  authorId?: string;
  isNew?: boolean;
}

export interface DetailedTicket extends Ticket {
  clientName: string;
  equipmentInfo: string;
  userFirstName: string;
  userLastName: string;
  attachments: Attachment[];
  responses?: TicketResponse[];
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
}

export interface Equipment {



  id: number;



  brand: string;



  model: string;



  serialNumber: string;



  clientId: number;
  clientName?: string;
}







export interface Technician {

  id: string;
  name: string;
  role?: UserRole;
  isActive?: boolean;
  color?: string;
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
  raw_stock_quantity?: number;
  raw_stock_contract?: number;
  available_quantity?: number;
  available_quantity_contract?: number;
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
  raw_stock_quantity?: number;
  raw_stock_contract?: number;
  available_quantity?: number;
  available_quantity_contract?: number;
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
  classification?: ServiceClassification;
  // Campos preenchidos por JOINs para a visualização do relatório
  clientName?: string;
  clientAddress?: string;
  clientNif?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentSerialNumber?: string;
  timeBlocks?: TimeBlock[];
  clients?: { name: string };
  billing_status?: BillingStatus;
}

export interface InternalTask {
  id: number;
  user_id: string; // Assignee
  created_by: string; // Creator
  title: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  client_id?: number | null;
  equipment_id?: number | null;
  is_private: boolean;
  show_on_calendar: boolean;
  estimated_hours?: number | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    first_name: string | null;
    last_name: string | null;
    color: string | null;
  };
  creator?: {
    first_name: string | null;
    last_name: string | null;
  };
  clients?: {
    name: string;
  };
  equipments?: {
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
  };
  internal_task_time_blocks?: InternalTaskTimeBlock[];
}

export interface InternalTaskTimeBlock {
  id: number;
  task_id: number;
  start_time: string;
  end_time: string;
}

