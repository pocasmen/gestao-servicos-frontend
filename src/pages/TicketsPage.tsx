import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { Ticket } from '../types';
import { TicketStatus } from '../constants/enums';
import { useNavigate, useLocation } from 'react-router-dom';
import { TicketSchema } from '../schemas';
import {
  CalendarPlus,
  Calendar,
  Eye,
  FileText,
  Trash2,
  Search,
  Plus,
  X,
  Check
} from 'lucide-react';

import logger from '../utils/logger';

const TicketsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { confirm, alert } = useConfirm();
  const [activeTab, setActiveTab] = useState<TicketStatus>(TicketStatus.OPEN);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const channel = supabase
      .channel('public:tickets:manager')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          logger.info(payload, 'Ticket table changed:');
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Queries
  const { data: ticketsData, isLoading, isError, error } = useQuery({
    queryKey: ['tickets', activeTab, page, location.pathname],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets?status=${activeTab}&page=${page}&limit=100`);
      const rawData = response.data?.data || response.data;
      const rawArray = Array.isArray(rawData) ? rawData : [];

      const validated = rawArray.map((item: unknown) => {
        const result = TicketSchema.safeParse(item);
        if (!result.success) {
          logger.error(result.error.format(), '[SCHEMA_ERROR] Ticket validation failed:');
          return item as Ticket;
        }
        return result.data as Ticket;
      }) as Ticket[];

      const pagination = response.data?.pagination || { page: 1, totalPages: 1, total: 0, limit: 100 };
      return { items: validated, pagination };
    }
  });

  const tickets = ticketsData?.items || [];
  const pagination = ticketsData?.pagination || { page: 1, totalPages: 1, total: 0, limit: 100 };

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (ticketId: number) => apiClient.delete(`/api/tickets/${ticketId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err: any) => {
      logger.error(err, "Erro ao eliminar o ticket:");
      alert("Ocorreu um erro ao tentar eliminar o ticket.");
    }
  });
  // ... existing handlers (no changes needed) ...
  const handleScheduleTicket = (ticket: Ticket) => {
    navigate('/calendar', { state: { ticketToSchedule: ticket } });
  };

  const handleEditSchedule = (ticket: Ticket) => {
    if (!ticket.scheduleId) return;
    navigate('/calendar', { state: { scheduleToEditId: ticket.scheduleId } });
  };

  const handleCreateReportFromTicket = (ticket: Ticket) => {
    if (!ticket.scheduleId) return;
    navigate('/calendar', { state: { ticketToReport: ticket } });
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (await confirm({
      message: `Tem a certeza que quer eliminar o ticket #${ticketId}? Esta ação não pode ser revertida.`,
      title: 'Eliminar Ticket',
      variant: 'danger',
      confirmText: 'Eliminar'
    })) {
      deleteMutation.mutate(ticketId);
    }
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center p-3 border-top">
        <div className="text-muted small">Mostrando {tickets.length} de {pagination.total} tickets</div>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(pagination.page - 1)}>Anterior</button>
            </li>
            {[...Array(pagination.totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
              </li>
            ))}
            <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(pagination.page + 1)}>Próximo</button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  const renderTicketsTable = () => (
    <div className="card">
      <div className="card-header bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">Lista de Tickets</span>
          <span className="badge bg-secondary">{pagination.total} Total</span>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Data/Hora</th>
                <th>Cliente</th>
                <th>Utilizador</th>
                <th>Equipamento</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">Não existem tickets neste estado.</td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>{new Date(ticket.createdAt).toLocaleString('pt-PT')}</td>
                    <td>{ticket.clientName}</td>
                    <td>{ticket.userFirstName ? `${ticket.userFirstName} ${ticket.userLastName}` : `Ticket #${ticket.id}`}</td>
                    <td>{ticket.equipmentInfo}</td>
                    <td className="text-end">
                      {(activeTab === TicketStatus.OPEN || activeTab === TicketStatus.ACKNOWLEDGED) && (
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleScheduleTicket(ticket)}
                          title="Agendar"
                        >
                          <CalendarPlus size={18} />
                        </button>
                      )}
                      {activeTab === TicketStatus.SCHEDULED && (
                        ticket.scheduleId ? (
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            onClick={() => handleEditSchedule(ticket)}
                            title="Editar Agendamento"
                          >
                            <Calendar size={18} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => handleScheduleTicket(ticket)}
                            title="Agendar"
                          >
                            <CalendarPlus size={18} />
                          </button>
                        )
                      )}
                      {(activeTab === TicketStatus.SCHEDULED || activeTab === TicketStatus.OPEN || activeTab === TicketStatus.ACKNOWLEDGED || activeTab === TicketStatus.CLOSED) && (
                        <button
                          className="btn btn-sm btn-outline-info me-2"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {activeTab === TicketStatus.CLOSED && (
                        <button
                          className="btn btn-sm btn-outline-success me-2"
                          onClick={() => handleCreateReportFromTicket(ticket)}
                          title="Gerar Relatório"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      {activeTab !== TicketStatus.CLOSED && activeTab !== TicketStatus.DELETED && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          title="Eliminar Ticket"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {renderPagination()}
    </div>
  );

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestão de Tickets</h1>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.OPEN ? 'active' : ''}`} onClick={() => { setActiveTab(TicketStatus.OPEN); setPage(1); }}>Abertos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.SCHEDULED ? 'active' : ''}`} onClick={() => { setActiveTab(TicketStatus.SCHEDULED); setPage(1); }}>Agendados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.CLOSED ? 'active' : ''}`} onClick={() => { setActiveTab(TicketStatus.CLOSED); setPage(1); }}>Fechados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.DELETED ? 'active' : ''}`} onClick={() => { setActiveTab(TicketStatus.DELETED); setPage(1); }}>Eliminados</button>
        </li>
      </ul>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="alert alert-danger">
          Erro ao carregar tickets: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        renderTicketsTable()
      )}
    </div>
  );
};

export default TicketsPage;
