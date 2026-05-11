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
  Check,
  Ticket as TicketIcon,
  Link2
} from 'lucide-react';

import logger from '../utils/logger';
import LinkToScheduleModal from '../components/LinkToScheduleModal';

const TicketsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { confirm, alert } = useConfirm();
  const [activeTab, setActiveTab] = useState<TicketStatus>(TicketStatus.OPEN);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTicketForLink, setSelectedTicketForLink] = useState<Ticket | null>(null);

  useEffect(() => {
    logger.debug('[DEBUG:REALTIME] Ticket list monitoring started...');

    // 1. Listen for explicit ticket broadcasts (Fast)
    const ticketChannel = supabase
      .channel('ticket_updates')
      .on('broadcast', { event: 'ticket_changed' }, (payload) => {
        logger.debug(payload, '[DEBUG:REALTIME] Ticket broadcast received:');
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();

    // 2. Listen for calendar broadcasts (Related to tickets)
    const calendarChannel = supabase
      .channel('calendar_updates')
      .on('broadcast', { event: 'schedule_changed' }, (payload) => {
        logger.debug(payload, '[DEBUG:REALTIME] Calendar broadcast received (updating tickets):');
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();

    // 3. PostgreSQL Changes Backup (Standard)
    const dbChannel = supabase
      .channel('public:tickets:manager')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          logger.info(payload, 'Ticket table changed (DB):');
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
      )
      .subscribe((status, err) => {
        if (err) logger.error(err, '[DEBUG:REALTIME] Subscription error:');
        logger.debug(`[DEBUG:REALTIME] DB connection status: ${status}`);
      });

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(dbChannel);
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

  const handleOpenLinkModal = (ticket: Ticket) => {
    setSelectedTicketForLink(ticket);
    setIsLinkModalOpen(true);
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-4 bg-white border-top gap-3">
        <div className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
          Mostrando <span className="text-primary">{tickets.length}</span> de <span className="text-dark">{pagination.total}</span> tickets
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 gap-2">
            <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
              <button className="page-link rounded-pill border-light shadow-sm px-4 fw-bold transition-all" onClick={() => setPage(pagination.page - 1)}>
                <i className="bi bi-chevron-left me-1"></i> Anterior
              </button>
            </li>
            {[...Array(pagination.totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}>
                <button
                  className={`page-link rounded-pill border-0 shadow-sm px-3 fw-bold transition-all ${pagination.page === i + 1 ? 'bg-primary text-white scale-up' : 'text-muted hover-bg-light'}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
              <button className="page-link rounded-pill border-light shadow-sm px-4 fw-bold transition-all" onClick={() => setPage(pagination.page + 1)}>
                Próximo <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  const renderTicketsTable = () => (
    <div className="glass-card border-0 shadow-lg overflow-hidden animate__animated animate__fadeInUp" style={{ borderRadius: '24px' }}>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-dark text-white">
            <tr className="text-uppercase small fw-bold" style={{ letterSpacing: '0.1em' }}>
              <th className="ps-4 py-3 border-0">Data/Hora</th>
              <th className="py-3 border-0">Cliente / Equipamento</th>
              <th className="py-3 border-0">Utilizador</th>
              <th className="text-end pe-4 py-3 border-0">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-5">
                  <div className="text-muted py-4">
                    <Search size={64} className="opacity-10 mb-4" />
                    <h5 className="fw-bold text-dark opacity-50 mb-1">Sem resultados</h5>
                    <p className="m-0 fw-medium small">Não existem tickets para o filtro selecionado.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="transition-all hover-bg-light">
                  <td className="ps-4 py-4">
                    <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                      {new Date(ticket.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="small text-muted font-monospace" style={{ fontSize: '0.8rem' }}>
                      {new Date(ticket.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="fw-bold text-primary mb-1" style={{ fontSize: '0.95rem' }}>{ticket.clientName}</div>
                    <div className="small text-muted d-flex align-items-center gap-1 fw-medium">
                      <FileText size={12} className="text-primary opacity-50" />
                      <span className="text-truncate" style={{ maxWidth: '250px' }}>{ticket.equipmentInfo || 'S/ Equipamento'}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-gradient-primary rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm transition-all hover-scale"
                        style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
                        {ticket.userFirstName?.charAt(0) || ticket.id}
                      </div>
                      <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                        {ticket.userFirstName ? `${ticket.userFirstName} ${ticket.userLastName}` : `Ticket #${ticket.id}`}
                      </div>
                    </div>
                  </td>
                  <td className="text-end pe-4 py-4">
                    <div className="d-flex justify-content-end gap-2">
                      {(activeTab === TicketStatus.OPEN || activeTab === TicketStatus.ACKNOWLEDGED) && (
                        <>
                          <button
                            className="btn btn-icon btn-outline-primary rounded-circle shadow-sm"
                            onClick={() => handleScheduleTicket(ticket)}
                            title="Agendar Novo"
                          >
                            <CalendarPlus size={18} />
                          </button>
                          <button
                            className="btn btn-icon btn-outline-secondary rounded-circle shadow-sm"
                            onClick={() => handleOpenLinkModal(ticket)}
                            title="Vincular a Agendamento Existente"
                          >
                            <Link2 size={18} />
                          </button>
                        </>
                      )}

                      {activeTab === TicketStatus.SCHEDULED && (
                        ticket.scheduleId ? (
                          <button
                            className="btn btn-icon btn-outline-secondary rounded-circle shadow-sm"
                            onClick={() => handleEditSchedule(ticket)}
                            title="Editar Agendamento"
                          >
                            <Calendar size={18} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-icon btn-outline-primary rounded-circle shadow-sm"
                              onClick={() => handleScheduleTicket(ticket)}
                              title="Agendar Novo"
                            >
                              <CalendarPlus size={18} />
                            </button>
                            <button
                              className="btn btn-icon btn-outline-secondary rounded-circle shadow-sm"
                              onClick={() => handleOpenLinkModal(ticket)}
                              title="Vincular a Agendamento Existente"
                            >
                              <Link2 size={18} />
                            </button>
                          </>
                        )
                      )}

                      <button
                        className="btn btn-icon btn-outline-info rounded-circle shadow-sm"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </button>

                      {activeTab === TicketStatus.CLOSED && (
                        <button
                          className="btn btn-icon btn-outline-success rounded-circle shadow-sm"
                          onClick={() => handleCreateReportFromTicket(ticket)}
                          title="Gerar Relatório"
                        >
                          <FileText size={18} />
                        </button>
                      )}

                      {activeTab !== TicketStatus.CLOSED && activeTab !== TicketStatus.DELETED && (
                        <button
                          className="btn btn-icon btn-outline-danger rounded-circle shadow-sm"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          title="Eliminar Ticket"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

  return (
    <div className="container-fluid py-4 min-vh-100 bg-light animate__animated animate__fadeIn">
      {/* Premium Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4 mb-5 px-2">
        <div>
        <div className="d-flex align-items-center gap-3">
          <TicketIcon size={40} strokeWidth={2.5} className="text-primary" />
          <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Tickets</h1>
        </div>
          <p className="text-muted small m-0 fst-italic">
            Central de atendimento: acompanhe e gira os novos pedidos de assistência.
          </p>
        </div>
        <div className="d-flex align-items-center">
          <div className="glass-card p-1 rounded-pill d-flex gap-1 shadow-sm border bg-white overflow-hidden">
            {[
              { id: TicketStatus.OPEN, label: 'Abertos', icon: 'bi-envelope' },
              { id: TicketStatus.SCHEDULED, label: 'Agendados', icon: 'bi-calendar-check' },
              { id: TicketStatus.CLOSED, label: 'Fechados', icon: 'bi-check-circle' },
              { id: TicketStatus.DELETED, label: 'Arquivo', icon: 'bi-archive' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`btn rounded-pill px-4 py-2 fw-bold border-0 d-flex align-items-center gap-2 transition-all ${activeTab === tab.id ? 'btn-primary shadow-md' : 'btn-light text-muted opacity-75 hover-opacity-100'}`}
                onClick={() => { setActiveTab(tab.id as TicketStatus); setPage(1); }}
                style={{ fontSize: '0.85rem' }}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span className="d-none d-sm-inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5 glass-card shadow-sm border-0">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3 text-muted fw-medium">A carregar tickets...</p>
        </div>
      ) : isError ? (
        <div className="alert alert-danger rounded-4 shadow-sm border-0 animate__animated animate__shakeX">
          <X className="me-2" />
          Erro ao carregar tickets: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      ) : (
        renderTicketsTable()
      )}

      <LinkToScheduleModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedTicketForLink(null);
        }}
        ticket={selectedTicketForLink}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />
    </div>
  );
};

export default TicketsPage;
