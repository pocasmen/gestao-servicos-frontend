import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import apiClient from '../apiClient';
import { History, ArrowLeftRight, Check, X, Search, Power, PowerOff } from 'lucide-react';
import { Equipment, Client } from '../types';
import { ClientSchema } from '../schemas';
import { useQuery } from '@tanstack/react-query';

interface EquipmentHistory {
  details: Equipment & { clientName: string, status: string };
  tickets: any[];
  schedules: any[];
  reports: any[];
}

interface OwnershipRecord {
  id: number;
  equipment_id: number;
  client_id: number;
  clientName: string;
  start_date: string;
  end_date: string | null;
}

const EquipmentHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<EquipmentHistory | null>(null);
  const [ownershipHistory, setOwnershipHistory] = useState<OwnershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // States for Transfer Modal
  const [selectedClientSearch, setSelectedClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  const { alert, confirm } = useConfirm();

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await apiClient.get('/api/clients');
      return (response.data || []).map((item: any) => ClientSchema.parse(item)) as Client[];
    },
    enabled: isTransferModalOpen
  });

  const loadData = () => {
    if (id) {
      setLoading(true);
      Promise.all([
        apiClient.get(`/api/equipments/${id}/history`),
        apiClient.get(`/api/equipments/${id}/ownership`)
      ])
        .then(([historyRes, ownershipRes]) => {
          setHistory(historyRes.data);
          setOwnershipHistory(ownershipRes.data);
        })
        .catch(err => {
          logger.error(err, `Erro ao carregar histórico do equipamento ${id}:`);
          alert('Não foi possível carregar os dados do equipamento.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const toggleStatus = async () => {
    if (!history) return;
    const newStatus = history.details.status === 'active' ? 'inactive' : 'active';

    if (await confirm({
      message: `Tem a certeza que deseja colocar este equipamento como ${newStatus === 'active' ? 'Ativo' : 'Inativo'}?${newStatus === 'inactive' ? ' Não será possível criar novos serviços para este aparelho.' : ''}`,
      title: 'Alterar Estado do Equipamento',
      variant: newStatus === 'active' ? 'primary' : 'warning',
      confirmText: 'Confirmar'
    })) {
      setIsChangingStatus(true);
      try {
        await apiClient.put(`/api/equipments/${id}`, { status: newStatus });
        alert(`Equipamento colocado como ${newStatus === 'active' ? 'Ativo' : 'Inativo'} com sucesso!`, 'Sucesso');
        loadData();
      } catch (err) {
        logger.error(err, 'Erro ao alterar estado:');
        alert('Erro ao alterar estado do equipamento.');
      } finally {
        setIsChangingStatus(false);
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    setIsTransferring(true);
    try {
      await apiClient.post(`/api/equipments/${id}/transfer`, {
        newClientId: selectedClientId,
        transferDate
      });
      alert('Equipamento transferido com sucesso!', 'Sucesso');
      setIsTransferModalOpen(false);
      setSelectedClientId(null);
      setSelectedClientSearch('');
      loadData();
    } catch (err: any) {
      logger.error(err, 'Erro ao transferir equipamento:');
      alert(err.response?.data?.error || 'Erro ao transferir equipamento.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="skeleton skeleton-title" style={{ width: '400px' }}></div>
        <div className="row">
          <div className="col-lg-4">
            <div className="card mb-4 p-4">
              <div className="skeleton skeleton-title" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="skeleton mb-3" style={{ height: '42px', borderRadius: '8px' }}></div>
            <div className="card p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="mb-3">
                  <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!history) {
    return <div className="container-fluid mt-4">Nenhum dado encontrado para este equipamento.</div>;
  }

  const { details, tickets, schedules, reports } = history;

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <History size={40} strokeWidth={2.5} className="text-primary" />
        <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Histórico do Equipamento</h1>
      </div>

      <div className="row">
        {/* Left Column: Details */}
        <div className="col-lg-4">
          <div className="card glass-card border-0 mb-4 overflow-hidden rounded-4 shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-3 border-0">
              <h5 className="m-0 fw-bold">{details.brand} {details.model}</h5>
              <button
                className={`btn btn-sm ${details.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} d-flex align-items-center gap-1 rounded-pill px-3 transition-all`}
                onClick={toggleStatus}
                disabled={isChangingStatus}
                title={details.status === 'active' ? 'Inativar Equipamento' : 'Ativar Equipamento'}
              >
                {details.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
                {details.status === 'active' ? 'Inativar' : 'Ativar'}
              </button>
            </div>
            <div className="card-body p-4" style={{ backgroundColor: 'white' }}>
              <div className="mb-3">
                <label className="small fw-bold text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.65rem' }}>Número de Série</label>
                <div className="h6 fw-normal m-0">{details.serialNumber}</div>
              </div>

              <div className="mb-3">
                <label className="small fw-bold text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.65rem' }}>Estado Operacional</label>
                <span className={`badge ${details.status === 'active' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3`}>
                  {details.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="mb-3">
                <label className="small fw-bold text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.65rem' }}>Proprietário Atual</label>
                <div className="h6 fw-bold text-primary m-0">{details.clientName}</div>
              </div>

              {details.additionalInfo && (
                <div>
                  <label className="small fw-bold text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.65rem' }}>Notas Técnicas</label>
                  <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>{details.additionalInfo}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History Tabs */}
        <div className="col-lg-8">
          <ul className="nav nav-tabs border-0 gap-2 mb-3" id="historyTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button className="nav-link active rounded-pill border-0 px-4 py-2 fw-bold" id="tickets-tab" data-bs-toggle="tab" data-bs-target="#tickets" type="button" role="tab">Tickets ({tickets.length})</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className="nav-link rounded-pill border-0 px-4 py-2 fw-bold" id="schedules-tab" data-bs-toggle="tab" data-bs-target="#schedules" type="button" role="tab">Agendamentos ({schedules.length})</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className="nav-link rounded-pill border-0 px-4 py-2 fw-bold" id="reports-tab" data-bs-toggle="tab" data-bs-target="#reports" type="button" role="tab">Relatórios ({reports.length})</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className="nav-link rounded-pill border-0 px-4 py-2 fw-bold" id="ownership-tab" data-bs-toggle="tab" data-bs-target="#ownership" type="button" role="tab">Propriedade ({ownershipHistory.length})</button>
            </li>
          </ul>

          <div className="tab-content glass-card border-0 p-4 rounded-4 shadow-sm" id="historyTabsContent" style={{ backgroundColor: 'white' }}>
            <div className="tab-pane fade show active" id="tickets" role="tabpanel">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>ID</th><th>Data</th><th>Descrição</th><th>Estado</th></tr></thead>
                  <tbody>
                    {tickets.length === 0 ? <tr><td colSpan={4} className="text-center py-4 text-muted">Sem registos</td></tr> : tickets.map(ticket => (
                      <tr key={ticket.id}>
                        <td><Link to="/tickets" state={{ ticketToHighlight: ticket.id }} className="fw-bold">#{ticket.id}</Link></td>
                        <td className="small">{new Date(ticket.createdAt).toLocaleDateString('pt-PT')}</td>
                        <td className="small text-truncate" style={{ maxWidth: '250px' }}>{ticket.faultDescription}</td>
                        <td><span className={`badge bg-${ticket.status === 'open' ? 'danger' : 'secondary'} rounded-pill`}>{ticket.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tab-pane fade" id="schedules" role="tabpanel">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>ID</th><th>Data</th><th>Título</th><th>Técnicos</th><th>Estado</th></tr></thead>
                  <tbody>
                    {schedules.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">Sem registos</td></tr> : schedules.map(schedule => (
                      <tr key={schedule.id}>
                        <td><Link to="/calendar" state={{ scheduleToEditId: schedule.id }} className="fw-bold">#{schedule.id}</Link></td>
                        <td className="small">{new Date(schedule.startDate).toLocaleString('pt-PT')}</td>
                        <td className="small">{schedule.title}</td>
                        <td className="small">{schedule.technicians.join(', ')}</td>
                        <td>{schedule.isCompleted ? <span className="badge bg-success rounded-pill">Concluído</span> : <span className="badge bg-warning rounded-pill">Pendente</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tab-pane fade" id="reports" role="tabpanel">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>ID</th><th>Data</th><th>Horas</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {reports.length === 0 ? <tr><td colSpan={4} className="text-center py-4 text-muted">Sem registos</td></tr> : reports.map(report => (
                      <tr key={report.id}>
                        <td><Link to={`/report/print/${report.id}`} target="_blank" className="fw-bold">#{report.id}</Link></td>
                        <td className="small">{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
                        <td className="small">{report.hours}h</td>
                        <td className="small text-truncate" style={{ maxWidth: '250px' }}>{report.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tab-pane fade" id="ownership" role="tabpanel">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="m-0 fw-bold">Timeline de Propriedade</h5>
                <button
                  className="btn btn-primary btn-sm d-flex align-items-center gap-2 rounded-pill px-4 py-2 shadow-sm transition-all"
                  onClick={() => setIsTransferModalOpen(true)}
                  disabled={details.status === 'inactive'}
                >
                  <ArrowLeftRight size={16} />
                  Transferir Proprietário
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Proprietário</th>
                      <th>Desde</th>
                      <th>Até</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownershipHistory.map(record => (
                      <tr key={record.id}>
                        <td className="fw-bold">{record.clientName}</td>
                        <td>{new Date(record.start_date).toLocaleDateString('pt-PT')}</td>
                        <td>{record.end_date ? new Date(record.end_date).toLocaleDateString('pt-PT') : 'Presente'}</td>
                        <td>
                          {record.end_date ? (
                            <span className="badge bg-light text-muted border rounded-pill">Passado</span>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success rounded-pill">Atual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Transferência */}
      {isTransferModalOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn rounded-4" style={{ width: '90%', maxWidth: '500px' }}>
            <form onSubmit={handleTransfer}>
              <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 text-white">
                <h5 className="text-white fw-bold m-0">Transferir Equipamento</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsTransferModalOpen(false)}></button>
              </div>
              <div className="p-4" style={{ backgroundColor: 'white' }}>
                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Novo Proprietário</label>
                  <div className="input-group shadow-sm rounded-3 overflow-hidden border bg-white">
                    <span className="input-group-text bg-transparent border-0 pe-0 ps-3">
                      <Search size={16} className="text-muted opacity-50" />
                    </span>
                    <input
                      className="form-control border-0 py-2 ps-2 shadow-none"
                      list="transferClientOptions"
                      value={selectedClientSearch}
                      onChange={e => {
                        setSelectedClientSearch(e.target.value);
                        const c = allClients.find(cl => cl.name === e.target.value);
                        setSelectedClientId(c ? c.id : null);
                      }}
                      placeholder="Pesquisar novo cliente..."
                      required
                    />
                  </div>
                  <datalist id="transferClientOptions">
                    {allClients.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Data da Transferência</label>
                  <input
                    type="date"
                    className="form-control shadow-sm border rounded-3"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    required
                  />
                  <small className="text-muted mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                    O histórico deste cliente começará a partir desta data.
                  </small>
                </div>
              </div>
              <div className="px-4 py-3 bg-light border-top d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={() => setIsTransferModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isTransferring || !selectedClientId}>
                  {isTransferring ? <span className="spinner-border spinner-border-sm"></span> : <Check size={18} />}
                  Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentHistoryPage;
