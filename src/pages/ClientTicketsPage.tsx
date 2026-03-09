import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import { Equipment, Ticket } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { supabase } from '../supabase';

const ClientTicketsPage: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | string>('');
  const [title, setTitle] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { alert } = useConfirm();

  useEffect(() => {
    if (location.state && (location.state as any).equipmentId) {
      setSelectedEquipmentId((location.state as any).equipmentId);
    }
  }, [location.state]);

  const fetchClientData = useCallback(async (pageToFetch = 1) => {
    try {
      const equipmentsRes = await apiClient.get('/api/my-equipments');
      setEquipments(equipmentsRes.data);

      const ticketsRes = await apiClient.get(`/api/my-tickets?page=${pageToFetch}&limit=10`);
      if (ticketsRes.data && ticketsRes.data.data) {
        if (pageToFetch === 1) {
          setTickets(ticketsRes.data.data);
        } else {
          setTickets(prev => [...prev, ...ticketsRes.data.data]);
        }
        setPagination(ticketsRes.data.pagination);
      } else {
        setTickets(ticketsRes.data);
      }
    } catch (err: any) {
      logger.error(err, "Erro ao carregar dados do cliente:");
      alert('Não foi possível carregar os seus dados. Por favor, tente novamente.');
    }
  }, [alert]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useEffect(() => {
    const channel = supabase
      .channel('public:tickets:client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          logger.info(payload, 'Client Ticket table changed:');
          fetchClientData(1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClientData]);
  // ... handleSubmitTicket, handleViewReport unchanged ...
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId || !title.trim() || !faultDescription.trim()) {
      alert('Por favor, selecione um equipamento, indique o título e descreva a avaria.');
      return;
    }

    try {
      await apiClient.post('/api/my-tickets', {
        equipmentId: Number(selectedEquipmentId),
        title: title.trim(),
        faultDescription,
      });
      alert('O seu pedido foi submetido com sucesso! Em breve entraremos em contacto.', 'Sucesso');
      setFaultDescription('');
      setTitle('');
      setSelectedEquipmentId('');
      fetchClientData(1); // Reset to page 1
    } catch (err: any) {
      logger.error(err, "Erro ao submeter ticket:");
      alert(err.response?.data?.error || 'Ocorreu um erro ao submeter o pedido.');
    }
  };

  const handleViewReport = async (ticket: Ticket) => {
    if (!ticket.scheduleId) return;
    try {
      const response = await apiClient.get(`/api/my-report/by-schedule/${ticket.scheduleId}`);
      if (response.data && response.data.id) {
        navigate(`/report/print/${response.data.id}`);
      } else {
        alert("Relatório não encontrado.");
      }
    } catch (error) {
      logger.error(error, "Erro ao carregar o relatório:");
      alert("Não foi possível carregar o relatório. Por favor, tente mais tarde.");
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Submeter Novo Pedido column ... same ... */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">Submeter Novo Pedido</div>
            <div className="card-body">
              <form onSubmit={handleSubmitTicket}>
                <div className="form-group mb-3">
                  <label htmlFor="titleInput">Título</label>
                  <input
                    type="text"
                    className="form-control"
                    id="titleInput"
                    placeholder="Erro 31 ou Não arranca"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="equipmentSelect">Selecione o Equipamento</label>
                  <select
                    className="form-control"
                    id="equipmentSelect"
                    value={selectedEquipmentId}
                    onChange={(e) => setSelectedEquipmentId(e.target.value)}
                    required
                  >
                    <option value="">-- Selecione um equipamento --</option>
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.brand} - {eq.model} (NS: {eq.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="faultDescription">Avaria/Descrição</label>
                  <textarea
                    className="form-control"
                    id="faultDescription"
                    rows={4}
                    value={faultDescription}
                    onChange={(e) => setFaultDescription(e.target.value)}
                    placeholder="O equipamento não passa diagnósticos"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary">Submeter Pedido</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">Os Seus Pedidos Recentes</div>
            <div className="card-body">
              {tickets.length > 0 ? (
                <>
                  <ul className="list-group">
                    {tickets.map((ticket) => (
                      <Link to={`/portal/tickets/${ticket.id}`} key={ticket.id} className="list-group-item list-group-item-action">
                        <>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong>Ticket #{ticket.id}</strong> - {ticket.equipmentInfo}
                              <br />
                              <small className="text-muted">Pedido em: {new Date(ticket.createdAt).toLocaleString('pt-PT')}</small>
                              <p className="mb-1">{ticket.faultDescription}</p>
                            </div>
                            <span className={`badge ${ticket.status === 'open' ? 'bg-danger'
                              : ticket.status === 'acknowledged' ? 'bg-warning'
                                : ticket.status === 'scheduled' ? 'bg-info'
                                  : ticket.status === 'deleted' ? 'bg-secondary'
                                    : 'bg-success'
                              }`}>
                              {ticket.status === 'open' && 'Aberto'}
                              {ticket.status === 'acknowledged' && 'Em Análise'}
                              {ticket.status === 'scheduled' && 'Agendado'}
                              {ticket.status === 'closed' && 'Fechado'}
                              {ticket.status === 'deleted' && 'Eliminado'}
                            </span>
                          </div>

                          {ticket.status === 'scheduled' && ticket.startDate && (
                            <div className="mt-2 pt-2 border-top">
                              <p className="mb-1">
                                <strong>Agendado para:</strong> {new Date(ticket.startDate).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {ticket.endDate && ` - ${new Date(ticket.endDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                              </p>
                            </div>
                          )}

                          {ticket.status === 'closed' && (
                            <div className="mt-2 pt-2 border-top">
                              {ticket.hasReport ? (
                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.preventDefault(); handleViewReport(ticket); }}>
                                  Ver Relatório
                                </button>
                              ) : (
                                <p className="mb-0 fst-italic text-muted">
                                  Relatório em Elaboração...
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      </Link>
                    ))}
                  </ul>
                  {pagination.page < pagination.totalPages && (
                    <div className="text-center mt-3">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => fetchClientData(pagination.page + 1)}>
                        Carregar Mais Pedidos
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p>Não submeteu nenhum pedido ainda.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientTicketsPage;
