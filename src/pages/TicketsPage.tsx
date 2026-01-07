import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import { Ticket } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState('open');
  const navigate = useNavigate();

  const location = useLocation();

  const fetchTickets = useCallback(() => {
    apiClient.get(`/api/tickets?status=${activeTab}`)
      .then(response => {
        setTickets(response.data);
      })
      .catch(error => {
        console.error(`Erro ao carregar tickets com estado ${activeTab}:`, error);
      });
  }, [activeTab]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, location.pathname]);

  const handleScheduleTicket = (ticket: Ticket) => {
    // Navegar diretamente para /calendar para evitar perder o estado na redireção
    navigate('/calendar', { state: { ticketToSchedule: ticket } });
  };

  const handleEditSchedule = (ticket: Ticket) => {
    if (!ticket.scheduleId) return;
    // Navegar diretamente para /calendar para evitar perder o estado na redireção
    navigate('/calendar', { state: { scheduleToEditId: ticket.scheduleId } });
  };

  const handleCreateReportFromTicket = (ticket: Ticket) => {
    if (!ticket.scheduleId) return; // Um ticket fechado deve ter um scheduleId
    // Navegar diretamente para /calendar para evitar perder o estado na redireção
    navigate('/calendar', { state: { ticketToReport: ticket } });
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (window.confirm(`Tem a certeza que quer eliminar o ticket #${ticketId}? Esta ação não pode ser revertida.`)) {
      try {
        await apiClient.delete(`/admin/tickets/${ticketId}`);
        fetchTickets(); // Atualizar a lista de tickets
      } catch (error) {
        console.error("Erro ao eliminar o ticket:", error);
        alert("Ocorreu um erro ao tentar eliminar o ticket.");
      }
    }
  };

  const renderTicketsTable = () => (
    <table className="table table-hover">
      <thead>
        <tr>
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
            <td>{ticket.userFirstName ? `${ticket.userFirstName} ${ticket.userLastName}` : `Ticket #${ticket.id}`}</td>
            <td>{new Date(ticket.createdAt).toLocaleString('pt-PT')}</td>
            <td>{ticket.clientName}</td>
            <td>{ticket.equipmentInfo}</td>
            <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{ticket.faultDescription}</td>
            <td className="d-flex flex-wrap">
              {(activeTab === 'open' || activeTab === 'acknowledged') && (
                <button 
                  className="btn btn-primary btn-sm me-2 mb-1"
                  onClick={() => handleScheduleTicket(ticket)}
                >
                  Agendar
                </button>
              )}
              {activeTab === 'scheduled' && (
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
              {activeTab === 'scheduled' && (
                <button
                  className="btn btn-outline-info btn-sm me-2 mb-1"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  Detalhes
                </button>
              )}
              {activeTab === 'closed' && (
                <button 
                  className="btn btn-info btn-sm me-2 mb-1"
                  onClick={() => handleCreateReportFromTicket(ticket)}
                >
                  Relatório
                </button>
              )}
              {activeTab !== 'closed' && activeTab !== 'deleted' && (
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
  );

  return (
    <div className="container mt-4">
      <h2>Gestão de Tickets</h2>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'open' ? 'active' : ''}`} onClick={() => setActiveTab('open')}>Abertos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'scheduled' ? 'active' : ''}`} onClick={() => setActiveTab('scheduled')}>Agendados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'closed' ? 'active' : ''}`} onClick={() => setActiveTab('closed')}>Fechados</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'deleted' ? 'active' : ''}`} onClick={() => setActiveTab('deleted')}>Eliminados</button>
        </li>
      </ul>

      {tickets.length > 0 ? renderTicketsTable() : <p>Não existem tickets neste estado.</p>}
    </div>
  );
};

export default TicketsPage;
