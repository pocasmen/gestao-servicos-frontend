import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { useConfirm } from '../contexts/ConfirmContext';
import { Ticket } from '../types';
import { TicketStatus } from '../constants/enums';
import { useNavigate, useLocation } from 'react-router-dom';
import { TicketSchema } from '../schemas';

import logger from '../utils/logger';

const TicketsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { confirm, alert } = useConfirm();
  const [activeTab, setActiveTab] = useState<TicketStatus>(TicketStatus.OPEN);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

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
    mutationFn: (ticketId: number) => apiClient.delete(`/admin/tickets/${ticketId}`),
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
      <div className="d-flex justify-content-between align-items-center mt-3 mb-5">
        <div>Mostrando {tickets.length} de {pagination.total} tickets</div>
        <nav>
          <ul className="pagination mb-0">
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
    <>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Estado</th>
            <th>Utilizador</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Equipamento</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id}>
              <td>
                <span className={`badge bg-${ticket.status === TicketStatus.OPEN ? 'danger' : ticket.status === TicketStatus.ACKNOWLEDGED ? 'warning' : ticket.status === TicketStatus.SCHEDULED ? 'info' : 'success'}`}>
                  {ticket.status === TicketStatus.OPEN ? 'Aberto' : ticket.status === TicketStatus.ACKNOWLEDGED ? 'Em Análise' : ticket.status === TicketStatus.SCHEDULED ? 'Agendado' : 'Fechado'}
                </span>
              </td>
              <td>{ticket.userFirstName ? `${ticket.userFirstName} ${ticket.userLastName}` : `Ticket #${ticket.id}`}</td>
              <td>{new Date(ticket.createdAt).toLocaleString('pt-PT')}</td>
              <td>{ticket.clientName}</td>
              <td>{ticket.equipmentInfo}</td>
              <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{ticket.faultDescription}</td>
              <td className="d-flex flex-wrap">
                {(activeTab === TicketStatus.OPEN || activeTab === TicketStatus.ACKNOWLEDGED) && (
                  <button
                    className="btn btn-primary btn-sm me-2 mb-1"
                    onClick={() => handleScheduleTicket(ticket)}
                  >
                    Agendar
                  </button>
                )}
                {activeTab === TicketStatus.SCHEDULED && (
                  ticket.scheduleId ? (
                    <button
                      className="btn btn-secondary btn-sm me-2 mb-1"
                      onClick={() => handleEditSchedule(ticket)}
                    >
                      Editar Agend.
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm me-2 mb-1"
                      onClick={() => handleScheduleTicket(ticket)}
                    >
                      Agendar
                    </button>
                  )
                )}
                {activeTab === TicketStatus.SCHEDULED && (
                  <button
                    className="btn btn-outline-info btn-sm me-2 mb-1"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    Detalhes
                  </button>
                )}
                {activeTab === TicketStatus.CLOSED && (
                  <button
                    className="btn btn-info btn-sm me-2 mb-1"
                    onClick={() => handleCreateReportFromTicket(ticket)}
                  >
                    Relatório
                  </button>
                )}
                {activeTab !== TicketStatus.CLOSED && activeTab !== TicketStatus.DELETED && (
                  <button
                    className="btn btn-danger btn-sm mb-1"
                    onClick={() => handleDeleteTicket(ticket.id)}
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {renderPagination()}
    </>
  );

  return (
    <div className="container-fluid mt-4">
      <h2>Gestão de Tickets</h2>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.OPEN ? 'active' : ''}`} onClick={() => setActiveTab(TicketStatus.OPEN)}>Abertos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.SCHEDULED ? 'active' : ''}`} onClick={() => setActiveTab(TicketStatus.SCHEDULED)}>Agendados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.CLOSED ? 'active' : ''}`} onClick={() => setActiveTab(TicketStatus.CLOSED)}>Fechados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === TicketStatus.DELETED ? 'active' : ''}`} onClick={() => setActiveTab(TicketStatus.DELETED)}>Eliminados</button>
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
      ) : tickets.length > 0 ? (
        renderTicketsTable()
      ) : (
        <p>Não existem tickets neste estado.</p>
      )}
    </div>
  );
};

export default TicketsPage;
