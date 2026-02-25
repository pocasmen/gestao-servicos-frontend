import React, { useState, useEffect, useRef, useContext } from 'react';
import apiClient, { createReport, searchPartByReference, createPart, getTechnicians } from '../apiClient';
import { Link } from 'react-router-dom';
import { Report, Client, Equipment, PartItem, Technician } from '../types';
import { UserRole } from '../constants/enums';
import ReportModal from '../components/ReportModal';
import DeleteReportModal from '../components/DeleteReportModal';
import { Trash2, Pencil, Eye, Printer, Plus, X, Check, Search, Copy, Clipboard, Send, FileText } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { SERVICE_TYPE_LABELS, SERVICE_CLASSIFICATIONS_LIST } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { ReportSchema, ClientSchema, EquipmentSchema, TechnicianSchema } from '../schemas';
import logger from '../utils/logger';

// Formulário de Relatório
const ReportForm: React.FC<{ onReportAdded: () => void }> = ({ onReportAdded }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [technicianId, setTechnicianId] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [parts, setParts] = useState<PartItem[]>([]);
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [damage, setDamage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [classification, setClassification] = useState('geral');
  const damageRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const internalNotesRef = useRef<HTMLTextAreaElement>(null);
  const { alert } = useConfirm();

  useEffect(() => {
    [damageRef, descriptionRef, internalNotesRef].forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  }, [damage, description, internalNotes]);

  useEffect(() => {
    apiClient.get('/api/clients').then(res => {
      const validated = (res.data || []).map((item: any) => ClientSchema.parse(item));
      setClients(validated);
    }).catch(() => alert("Erro ao carregar clientes."));
  }, []);

  useEffect(() => {
    if (clientId) {
      apiClient.get(`/api/clients/${clientId}/equipments`).then(res => {
        const validated = (res.data || []).map((item: any) => EquipmentSchema.parse(item));
        setEquipments(validated);
      }).catch((err) => logger.error(err, 'Failed to fetch equipments'));
    } else {
      setEquipments([]);
    }
    setEquipmentId('');
  }, [clientId]);

  useEffect(() => {
    getTechnicians().then(res => {
      if (Array.isArray(res)) {
        const validated = res.map((item: any) => TechnicianSchema.parse(item));
        setTechnicians(validated.filter((t: Technician) => t.role !== UserRole.OFFICE_STAFF));
      } else {
        setTechnicians([]);
      }
    }).catch(() => setTechnicians([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceType || !clientId || !equipmentId) {
      await alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const partsToSubmit = await Promise.all(parts.map(async (part) => {
      if (!part.isDesignationLocked && part.reference && part.designation) {
        const newPart = await createPart({ reference: part.reference, designation: part.designation });
        return { ...part, reference: newPart.reference, designation: newPart.designation };
      }
      return part;
    }));

    const selectedTechnician = technicians.find(t => t.id === String(technicianId));

    createReport({
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicians: selectedTechnician ? [selectedTechnician] : [],
      serviceDate,
      hours: Number(hours),
      parts: partsToSubmit,
      description,
      serviceType: [serviceType],
      damage,
      internalNotes,
      classification,
    } as Report)
      .then(() => {
        setClientId('');
        setEquipmentId('');
        setTechnicianId('');
        setServiceDate('');
        setHours('');
        setParts([]);
        setDescription('');
        setServiceType('');
        setDamage('');
        setInternalNotes('');
        setClassification('geral');
        onReportAdded();
      })
      .catch((error: unknown) => {
        logger.error(error, "Erro ao criar relatório:");
        alert("Erro ao criar relatório.");
      });
  };

  const handleAddPart = () => {
    setParts([...parts, { quantity: 1, reference: '', designation: '' }]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  };

  const handlePartChange = async (index: number, field: keyof PartItem, value: string) => {
    const newParts = [...parts];
    if (field === 'quantity') {
      (newParts[index] as any)[field] = Number(value);
    } else {
      (newParts[index] as any)[field] = value;
    }

    if (field === 'reference' && value.trim() !== '') {
      const part = await searchPartByReference(value);
      if (part) {
        newParts[index].designation = part.designation;
        newParts[index].isDesignationLocked = true;
      } else {
        newParts[index].designation = '';
        newParts[index].isDesignationLocked = false;
      }
    }

    setParts(newParts);

    if (index === parts.length - 1 && field === 'reference' && value.trim() !== '') {
      setParts([...newParts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
    }
  };

  const handleCopyParts = async () => {
    const validParts = parts.filter(p => (p.reference && p.reference.trim() !== '') || (p.designation && p.designation.trim() !== ''));
    if (validParts.length === 0) {
      await alert('Não há peças para copiar.');
      return;
    }
    const partsToCopy = validParts.map(({ quantity, reference, designation }) => ({
      quantity,
      reference,
      designation
    }));
    const partsString = JSON.stringify(partsToCopy);

    // Guardar no localStorage
    localStorage.setItem('app_parts_clipboard', partsString);

    // Tentar guardar no sistema
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(partsString)
        .then(async () => await alert('Lista de peças copiada!'))
        .catch(async (err) => {
          logger.warn(err, 'Clipboard API failed:');
          await alert('Pronto! Lista guardada na memória interna.');
        });
    } else {
      await alert('Pronto! Lista guardada na memória interna.');
    }
  };

  const handlePasteParts = async () => {
    let partsString = localStorage.getItem('app_parts_clipboard');

    if (!partsString && navigator.clipboard && navigator.clipboard.readText) {
      try {
        partsString = await navigator.clipboard.readText();
      } catch (err) {
        logger.warn(err, 'Could not read clipboard API:');
      }
    }

    if (!partsString) {
      await alert('Nenhuma peça encontrada para colar.');
      return;
    }

    try {
      const pastedData = JSON.parse(partsString);
      if (Array.isArray(pastedData)) {
        const newPartsFromPaste = pastedData
          .filter(p => p.reference || p.designation)
          .map(p => ({
            quantity: Number(p.quantity) || 1,
            reference: p.reference || '',
            designation: p.designation || '',
            isDesignationLocked: !!p.reference
          }));

        if (newPartsFromPaste.length === 0) {
          await alert('Nenhuma peça válida encontrada.');
          return;
        }

        setParts(prev => {
          const filteredPrev = prev.filter(p => p.reference.trim() !== '' || p.designation.trim() !== '');
          return [...filteredPrev, ...newPartsFromPaste, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }];
        });
        await alert(`${newPartsFromPaste.length} peças coladas!`);
      } else {
        await alert('Conteúdo inválido.');
      }
    } catch (err) {
      logger.error(err, 'Erro ao colar:');
      await alert('Erro ao processar as peças.');
    }
  };

  return (
    <div className="mb-4">
      <h2>Novo Relatório de Intervenção</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Cliente</label>
          <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">Selecione um cliente...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Equipamento</label>
          <select className="form-control" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required disabled={!clientId}>
            <option value="">Selecione um equipamento...</option>
            {equipments.map(equipment => (
              <option key={equipment.id} value={equipment.id}>
                {`${equipment.brand || ''} ${equipment.model || ''}${equipment.serialNumber ? ` (${equipment.serialNumber})` : ''}`.trim()}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Técnico</label>
          <select className="form-control" value={technicianId} onChange={e => setTechnicianId(e.target.value)} required>
            <option value="">Selecione um técnico...</option>
            {technicians && technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Tipo de Serviço</label>
          <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
            <option value="">Selecione um tipo...</option>
            {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Classificação do Serviço</label>
          <select className="form-control" value={classification} onChange={e => setClassification(e.target.value)} required>
            {SERVICE_CLASSIFICATIONS_LIST.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Data do Serviço</label>
          <input type="date" className="form-control" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Nº de Horas</label>
          <input type="number" className="form-control" value={hours} onChange={e => setHours(e.target.value)} />
        </div>
        <div className="form-group">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="mb-0">Peças Utilizadas</label>
          </div>
          {parts.map((part, index) => (
            <div key={index} className="row mb-2">
              <div className="col-3"><input type="number" className="form-control" placeholder="Quantidade" value={part.quantity} onChange={e => handlePartChange(index, 'quantity', e.target.value)} /></div>
              <div className="col-4"><input type="text" className="form-control" placeholder="Referência" value={part.reference} onChange={e => handlePartChange(index, 'reference', e.target.value)} /></div>
              <div className="col-4"><input type="text" className="form-control" placeholder="Designação" value={part.designation} onChange={e => handlePartChange(index, 'designation', e.target.value)} disabled={part.isDesignationLocked} /></div>
              <div className="col-1">
                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemovePart(index)} title="Remover Peça">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 mt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPart} title="Adicionar Peça">
              <Plus size={18} />
            </button>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-sm btn-outline-info d-flex align-items-center"
                onClick={handleCopyParts}
                title="Copiar Peças"
              >
                <Copy size={18} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-info d-flex align-items-center"
                onClick={handlePasteParts}
                title="Colar Peças"
              >
                <Clipboard size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Descrição da Avaria</label>
          <textarea
            ref={damageRef}
            className="form-control"
            style={{ overflow: 'hidden', resize: 'none' }}
            value={damage}
            onChange={e => setDamage(e.target.value)}
            rows={1}
          />
        </div>
        <div className="form-group">
          <label>Descrição da Intervenção</label>
          <textarea
            ref={descriptionRef}
            className="form-control"
            style={{ overflow: 'hidden', resize: 'none' }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={1}
          />
        </div>
        <div className="form-group p-2 bg-light border rounded">
          <label className="text-primary font-weight-bold">Notas Internas (Não visível ao cliente)</label>
          <textarea
            ref={internalNotesRef}
            className="form-control"
            style={{ overflow: 'hidden', resize: 'none' }}
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            rows={1}
            placeholder="Notas para a equipa técnica..."
          />
        </div>
        <button type="submit" className="btn btn-primary mt-2" title="Criar Relatório">
          <Check size={20} />
        </button>
      </form>
    </div>
  );
};

// Lista de Relatórios
const ReportList: React.FC<{
  reports: Report[],
  onEditReport: (report: Report) => void,
  onDeleteReport: (report: Report) => void,
  isAdmin: boolean
}> = ({ reports, onEditReport, onDeleteReport, isAdmin }) => {
  return (
    <div>
      <h2>Histórico de Relatórios</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Equipamento</th>
              <th>Técnico(s)</th>
              <th>Data</th>
              <th>Tipo de Serviço</th>
              <th>Horas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td>{report.clientName}</td>
                <td>{report.equipmentBrand} - {report.equipmentModel}</td>
                <td>
                  {report.technicians && report.technicians.length > 1
                    ? 'Vários'
                    : report.technicians?.map(t => t.name).join(', ') || 'N/A'}
                </td>
                <td>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
                <td>
                  {Array.isArray(report.serviceType)
                    ? report.serviceType.map(t => SERVICE_TYPE_LABELS[t] || t).join(', ')
                    : SERVICE_TYPE_LABELS[report.serviceType] || report.serviceType}
                </td>
                <td>{report.hours}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Link to={`/report/print/${report.id}`} className="btn btn-sm btn-outline-primary shadow-sm d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} target="_blank" title="Ver / Imprimir">
                      <Printer size={18} />
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-secondary shadow-sm d-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px' }}
                      onClick={() => onEditReport(report)}
                      title="Editar Relatório"
                    >
                      <Pencil size={18} />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-sm btn-outline-danger shadow-sm d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => onDeleteReport(report)}
                        title="Eliminar Relatório"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Página de Relatórios
const ReportsPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { alert } = useConfirm();
  const isAdmin = user?.user_metadata?.role === UserRole.ADMIN || user?.user_metadata?.role === UserRole.SUPER_ADMIN;
  const [reports, setReports] = useState<Report[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reports using current state
  const fetchReports = async () => {
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (dateFilter) params.dateFilter = dateFilter;
    if (serviceTypeFilter) params.serviceType = serviceTypeFilter;

    try {
      const response = await apiClient.get('/api/reports', { params });
      const raw = response.data?.data || [];
      const validated = raw.map((item: unknown) => {
        const result = ReportSchema.safeParse(item);
        if (!result.success) {
          logger.error(result.error.format(), '[SCHEMA_ERROR] Report validation failed:');
          return item as Report;
        }
        return result.data as Report;
      });
      setReports(validated);
    } catch (error: unknown) {
      logger.error(error, "Erro ao carregar relatórios:");
      alert("Não foi possível carregar os relatórios.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load only
  useEffect(() => {
    fetchReports();
  }, []);

  const handleEditReport = (report: Report) => {
    setReportToEdit(report);
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportToEdit(null);
  };

  const handleReportSaved = () => {
    fetchReports();
    handleCloseReportModal();
  };

  const handleDeleteReport = (report: Report) => {
    setReportToDelete(report);
  };

  const confirmDeleteReport = (restoreParts: boolean) => {
    if (!reportToDelete) return;

    apiClient.delete(`/api/reports/${reportToDelete.id}?restoreParts=${restoreParts}`)
      .then(() => {
        setReportToDelete(null);
        fetchReports();
      })
      .catch((error: unknown) => {
        logger.error(error, "Erro ao eliminar relatório:");
        alert("Erro ao eliminar relatório.");
      });
  };

  const [showNewReportForm, setShowNewReportForm] = useState(false);

  // Allow triggering search with Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchReports();
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Gestão de Relatórios</h2>
        <button
          className={`btn ${showNewReportForm ? 'btn-secondary' : 'btn-success'}`}
          onClick={() => setShowNewReportForm(!showNewReportForm)}
          title={showNewReportForm ? 'Cancelar' : 'Novo Relatório'}
        >
          {showNewReportForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {showNewReportForm && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <ReportForm onReportAdded={() => {
              fetchReports();
              setShowNewReportForm(false);
            }} />
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="card mb-4 mt-4 shadow-sm" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label text-muted">Pesquisar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cliente, equipamento, série..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted">Período</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${dateFilter === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateFilter('')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`btn ${dateFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateFilter('today')}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  className={`btn ${dateFilter === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateFilter('week')}
                >
                  Semana
                </button>
                <button
                  type="button"
                  className={`btn ${dateFilter === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateFilter('month')}
                >
                  Mês
                </button>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted">Tipo de Serviço</label>
              <select
                className="form-select"
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button
                className="btn btn-primary w-100"
                onClick={fetchReports}
                disabled={isLoading}
                title="Pesquisar"
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : <Search size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ReportList
        reports={reports}
        onEditReport={handleEditReport}
        onDeleteReport={handleDeleteReport}
        isAdmin={isAdmin}
      />
      {reportToDelete && (
        <DeleteReportModal
          report={reportToDelete}
          onClose={() => setReportToDelete(null)}
          onConfirm={confirmDeleteReport}
        />
      )}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          schedule={null}
          reportToEdit={reportToEdit}
          onReportSaved={handleReportSaved}
        />
      )}
    </div>
  );
};

export default ReportsPage;
