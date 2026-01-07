import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import { Equipment, Ticket, Report } from '../types';
import ClientViewReportModal from '../components/ClientViewReportModal';
import { Link } from 'react-router-dom';

const ClientTicketsPage: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | string>('');
  const [title, setTitle] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for the report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchClientData = useCallback(async () => {
    console.log('[DEBUG] fetchClientData called.');
    try {
      const equipmentsRes = await apiClient.get('/api/my-equipments');
      console.log('[DEBUG] equipmentsRes:', equipmentsRes.data);
      setEquipments(equipmentsRes.data);
      const ticketsRes = await apiClient.get('/api/my-tickets');
      console.log('[DEBUG] ticketsRes:', ticketsRes.data);
      setTickets(ticketsRes.data);
    } catch (err: any) {
      console.error("Erro ao carregar dados do cliente:", err);
      console.error("Detalhes do erro:", err.response?.data || err.message || err);
      setError('Não foi possível carregar os seus dados. Por favor, tente novamente.');
    }
  }, []);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedEquipmentId || !title.trim() || !faultDescription.trim()) {
      setError('Por favor, selecione um equipamento, indique o título e descreva a avaria.');
      return;
    }

    try {
      await apiClient.post('/api/my-tickets', {
        equipmentId: Number(selectedEquipmentId),
        title: title.trim(),
        faultDescription,
      });
      setSuccess('O seu pedido foi submetido com sucesso! Em breve entraremos em contacto.');
      setFaultDescription('');
      setTitle('');
      setSelectedEquipmentId('');
      fetchClientData(); // Atualizar a lista de tickets
    } catch (err: any) {
      console.error("Erro ao submeter ticket:", err);
      setError(err.response?.data?.error || 'Ocorreu um erro ao submeter o pedido.');
    }
  };

  const handleViewReport = async (ticket: Ticket) => {
    if (!ticket.scheduleId) return;
    try {
      const response = await apiClient.get(`/api/my-report/by-schedule/${ticket.scheduleId}`);
      setSelectedReport(response.data);
      setIsReportModalOpen(true);
    } catch (error) {
      console.error("Erro ao carregar o relatório:", error);
      setError("Não foi possível carregar o relatório. Por favor, tente mais tarde.");
    }
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedReport(null);
  };

  return (
    <div className="container mt-4">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row">
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
                            : ticket.status === 'scheduled' ? 'bg-info'
                              : ticket.status === 'deleted' ? 'bg-secondary'
                                : 'bg-success'
                            }`}>
                            {ticket.status === 'open' && 'Aberto'}
                            {ticket.status === 'scheduled' && 'Agendado'}
                            {ticket.status === 'closed' && 'Fechado'}
                            {ticket.status === 'deleted' && 'Eliminado'}
                          </span>
                        </div>

                        {/* Lógica para Agendamentos */}
                        {ticket.status === 'scheduled' && ticket.startDate && (
                          <div className="mt-2 pt-2 border-top">
                            <p className="mb-1">
                              <strong>Agendado para:</strong> {new Date(ticket.startDate).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {ticket.endDate && ` - ${new Date(ticket.endDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>

                          </div>
                        )}

                        {/* Lógica para Relatórios em Tickets Fechados */}
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
              ) : (
                <p>Não submeteu nenhum pedido ainda.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClientViewReportModal
        isOpen={isReportModalOpen}
        onClose={handleCloseReportModal}
        report={selectedReport}
      />
    </div>
  );
};

export default ClientTicketsPage;
