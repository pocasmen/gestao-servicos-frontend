import React, { useState, useEffect, useRef, useContext } from 'react';
import apiClient, { createReport, searchPartByReference, createPart, getTechnicians } from '../apiClient';
import { Link } from 'react-router-dom';
import { Report, Client, Equipment, PartItem, Technician } from '../types';
import { format, parseISO } from 'date-fns';
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
  const [equipmentName, setEquipmentName] = useState<string>('');
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
    if (!serviceType || !clientId || !equipmentId || !serviceDate || !description.trim()) {
      await alert('Por favor, preencha todos os campos obrigatórios (Cliente, Equipamento, Técnico, Tipo, Data e Descrição).');
      return;
    }

    const invalidParts: string[] = [];
    const partsToSubmit = await Promise.all(parts.filter(p => p.reference || p.designation).map(async (part) => {
      if (!part.id && part.reference && part.designation) {
        try {
          const newPart = await createPart({ reference: part.reference, designation: part.designation });
          return { ...part, id: newPart.id, reference: newPart.reference, designation: newPart.designation };
        } catch (err) {
          logger.error(err, "Erro ao criar peça no formulário:");
          invalidParts.push(part.designation || part.reference);
          return part;
        }
      }
      if ((part.reference || part.designation) && !part.id) {
        invalidParts.push(part.designation || part.reference);
      }
      return part;
    }));

    if (invalidParts.length > 0) {
      const proceed = await confirm({
        title: 'Peças Inválidas',
        message: `As seguintes peças não foram encontradas: ${invalidParts.join(', ')}. Serão ignoradas. Continuar?`,
        variant: 'warning',
        confirmText: 'Sim',
        cancelText: 'Não'
      } as any);
      if (!proceed) return;
    }

    const finalParts = partsToSubmit.filter(p => p.id);

    const selectedTechnician = technicians.find(t => t.id === String(technicianId));

    createReport({
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicians: selectedTechnician ? [selectedTechnician] : [],
      serviceDate,
      hours: Number(hours),
      parts: finalParts,
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
      .catch(async (error: any) => {
        logger.error(error, "Erro ao criar relatório:");
        const errorMsg = error.response?.data?.error;
        const details = error.response?.data?.details;
        
        if (details && Array.isArray(details)) {
          const detailMsgs = details.map((d: any) => d.message).join('\n');
          alert(`Erro de Validação:\n${detailMsgs}`);
        } else {
          alert(errorMsg || "Erro ao criar relatório.");
        }
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
    <div className="glass-card border-0 mb-4 overflow-hidden animate__animated animate__fadeIn">
      <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
        <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Novo Relatório de Intervenção</h5>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Cliente</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <select className="form-select border-0 py-2 ps-3" value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Equipamento</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <select className="form-select border-0 py-2 ps-3" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required disabled={!clientId}>
                  <option value="">Selecione um equipamento...</option>
                  {equipments.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}${eq.nickname ? ` [${eq.nickname}]` : ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Técnico Principal</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <select className="form-select border-0 py-2 ps-3" value={technicianId} onChange={e => setTechnicianId(e.target.value)} required>
                  <option value="">Selecione um técnico...</option>
                  {technicians && technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Tipo de Serviço</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <select className="form-select border-0 py-2 ps-3" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
                  <option value="">Selecione um tipo...</option>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Classificação</label>
              <div className="input-group shadow-sm rounded-3 overflow-hidden border">
                <select className="form-select border-0 py-2 ps-3" value={classification} onChange={e => setClassification(e.target.value)} required>
                  {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Data do Serviço</label>
              <input type="date" className="form-control rounded-3 py-2 shadow-sm" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Nº de Horas</label>
              <input type="number" className="form-control rounded-3 py-2 shadow-sm" placeholder="Contabilizar tempo..." value={hours} onChange={e => setHours(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <label className="form-label small fw-bold text-muted text-uppercase m-0" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Peças Utilizadas</label>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-primary rounded-pill d-flex align-items-center gap-1" onClick={handleCopyParts} title="Copiar Peças">
                  <Copy size={16} /> <span className="small">Copiar</span>
                </button>
                <button type="button" className="btn btn-sm btn-outline-primary rounded-pill d-flex align-items-center gap-1" onClick={handlePasteParts} title="Colar Peças">
                  <Clipboard size={16} /> <span className="small">Colar</span>
                </button>
                <button type="button" className="btn btn-sm btn-primary rounded-pill d-flex align-items-center gap-1 shadow-sm" onClick={handleAddPart} title="Adicionar Peça">
                  <Plus size={16} /> <span className="small">Adicionar</span>
                </button>
              </div>
            </div>

            <div className="table-responsive rounded-3 border overflow-hidden">
              <table className="table table-sm align-middle mb-0">
                <thead className="bg-light">
                  <tr className="small text-muted">
                    <th className="ps-3" style={{ width: '80px' }}>QNT</th>
                    <th style={{ width: '25%' }}>REFERÊNCIA</th>
                    <th>DESIGNAÇÃO</th>
                    <th className="text-end pe-3" style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: 'none' }}>
                  {parts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted small">Nenhuma peça adicionada. Use Adicionar ou Colar.</td>
                    </tr>
                  ) : (
                    parts.map((part, index) => (
                      <tr key={index}>
                        <td className="ps-3"><input type="number" className="form-control form-control-sm border-0" value={part.quantity} onChange={e => handlePartChange(index, 'quantity', e.target.value)} /></td>
                        <td><input type="text" className="form-control form-control-sm border-0" placeholder="Ref..." value={part.reference} onChange={e => handlePartChange(index, 'reference', e.target.value)} /></td>
                        <td><input type="text" className="form-control form-control-sm border-0" placeholder="Descrição..." value={part.designation} onChange={e => handlePartChange(index, 'designation', e.target.value)} disabled={part.isDesignationLocked} /></td>
                        <td className="text-end pe-3">
                          <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemovePart(index)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row g-3 mb-4 text-areas-container">
            <div className="col-12">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Descrição da Avaria</label>
              <textarea
                ref={damageRef}
                className="form-control rounded-3 shadow-sm"
                style={{ resize: 'none' }}
                placeholder="Qual era o problema relatado?"
                value={damage}
                onChange={e => setDamage(e.target.value)}
                rows={2}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Descrição da Intervenção</label>
              <textarea
                ref={descriptionRef}
                className="form-control rounded-3 shadow-sm"
                style={{ resize: 'none' }}
                placeholder="O que foi feito para resolver?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="col-12">
              <div className="p-3 rounded-4" style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px dashed rgba(79, 70, 229, 0.2)' }}>
                <label className="form-label small fw-bold text-primary text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Notas Internas (Privadas)</label>
                <textarea
                  ref={internalNotesRef}
                  className="form-control bg-white border-0 shadow-sm rounded-3"
                  style={{ resize: 'none' }}
                  placeholder="Informação relevante apenas para técnicos..."
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button type="submit" className="btn btn-primary rounded-pill px-5 fw-bold shadow-sm d-flex align-items-center gap-2">
              <Check size={20} />
              <span>Gerar Relatório Profissional</span>
            </button>
          </div>
        </form>
      </div>
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
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead className="table-light">
          <tr className="text-uppercase small fw-bold text-muted">
            <th className="ps-4">Cliente / Equipamento</th>
            <th>Técnico(s)</th>
            <th>Data</th>
            <th>Serviço</th>
            <th>Horas</th>
            <th className="text-end pe-4">Ações</th>
          </tr>
        </thead>
        <tbody style={{ borderTop: 'none' }}>
          {reports.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-muted">Nenhum relatório encontrado.</td>
            </tr>
          ) : (
            reports.map(report => (
              <tr key={report.id} className="shadow-sm">
                <td className="ps-4 py-3">
                  <div className="fw-bold text-dark">{report.clientName}</div>
                  <div className="small text-muted">
                    {report.equipmentBrand} {report.equipmentModel}
                    {report.equipmentNickname && <span className="ms-1 fw-bold text-primary">[{report.equipmentNickname}]</span>}
                  </div>
                </td>
                <td>
                  <div className="small fw-medium text-dark">
                    {report.technicians?.length 
                      ? report.technicians.map(t => t.name).join(', ') 
                      : 'N/A'}
                  </div>
                </td>
                <td className="text-muted fw-medium">
                  {(() => {
                    const blocks = report.timeBlocks || report.time_blocks || [];
                    if (blocks.length > 0) {
                      const startStr = blocks[0].start || blocks[0].start_time;
                      if (startStr) return format(new Date(startStr), 'dd/MM/yyyy');
                    }
                    return report.serviceDate ? format(new Date(report.serviceDate), 'dd/MM/yyyy') : 'N/A';
                  })()}
                </td>
                <td>
                  <span className="small fw-semibold text-primary">
                    {Array.isArray(report.serviceType)
                      ? report.serviceType.map(t => SERVICE_TYPE_LABELS[t] || t).join(', ')
                      : SERVICE_TYPE_LABELS[report.serviceType] || report.serviceType}
                  </span>
                </td>
                <td>
                  <span className="fw-bold text-dark">{report.hours}h</span>
                </td>
                <td className="text-end pe-4">
                  <div className="d-flex justify-content-end gap-1">
                    <Link to={`/report/print/${report.id}`} className="btn btn-icon btn-outline-primary border-2 shadow-sm rounded-circle" target="_blank" title="Ver / Imprimir">
                      <Printer size={18} strokeWidth={2.5} />
                    </Link>
                    <button
                      className="btn btn-icon btn-outline-warning border-2 shadow-sm rounded-circle"
                      onClick={() => onEditReport(report)}
                      title="Editar Relatório"
                    >
                      <Pencil size={18} strokeWidth={2.5} />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-icon btn-outline-danger border-2 shadow-sm rounded-circle"
                        onClick={() => onDeleteReport(report)}
                        title="Eliminar Relatório"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 1,
    limit: 100
  });

  // Fetch reports using current state
  const fetchReports = async (pageOverride?: number) => {
    setIsLoading(true);
    const pageToFetch = pageOverride || currentPage;
    const params: Record<string, any> = {
      page: pageToFetch,
      limit: 50 // Reduzindo para 50 para melhor UX
    };
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
      if (response.data?.pagination) {
        setPaginationInfo(response.data.pagination);
        setCurrentPage(response.data.pagination.page);
      }
    } catch (error: unknown) {
      logger.error(error, "Erro ao carregar relatórios:");
      alert("Não foi possível carregar os relatórios.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load only
  useEffect(() => {
    fetchReports(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= paginationInfo.totalPages) {
      setCurrentPage(newPage);
      fetchReports(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterClick = () => {
    setCurrentPage(1);
    fetchReports(1);
  };

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
      handleFilterClick();
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 mt-2">
        <div>
        <div className="d-flex align-items-center gap-3">
          <FileText size={40} strokeWidth={2.5} className="text-primary" />
          <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Relatórios</h1>
        </div>
          <p className="text-muted small m-0 fst-italic">Consulte e emita relatórios de intervenção técnica</p>
        </div>
        <button
          className={`btn ${showNewReportForm ? 'btn-secondary' : 'btn-primary'} rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2`}
          onClick={() => setShowNewReportForm(!showNewReportForm)}
        >
          {showNewReportForm ? (
            <>
              <X size={20} />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus size={20} />
              <span>Novo Relatório</span>
            </>
          )}
        </button>
      </div>

      {showNewReportForm && (
        <ReportForm onReportAdded={() => {
          fetchReports();
          setShowNewReportForm(false);
        }} />
      )}

      {/* Filter Section */}
      <div className="glass-card border-0 mb-4 overflow-hidden">
        <div className="p-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Pesquisar</label>
              <div className="input-group shadow-sm rounded-pill overflow-hidden border bg-white ps-3">
                <span className="bg-transparent border-0 d-flex align-items-center text-muted pe-2">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-transparent py-2"
                  placeholder="Cliente, equipamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Período</label>
              <div className="btn-group w-100 shadow-sm rounded-3 overflow-hidden border" role="group">
                <button
                  type="button"
                  className={`btn border-0 py-2 py-lg-2 fw-medium ${dateFilter === '' ? 'btn-primary' : 'btn-white text-muted'}`}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setDateFilter('')}
                >
                  Tudo
                </button>
                <button
                  type="button"
                  className={`btn border-0 py-2 py-lg-2 fw-medium ${dateFilter === 'today' ? 'btn-primary' : 'btn-white text-muted'}`}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setDateFilter('today')}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  className={`btn border-0 py-2 py-lg-2 fw-medium ${dateFilter === 'week' ? 'btn-primary' : 'btn-white text-muted'}`}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setDateFilter('week')}
                >
                  Semana
                </button>
                <button
                  type="button"
                  className={`btn border-0 py-2 py-lg-2 fw-medium ${dateFilter === 'month' ? 'btn-primary' : 'btn-white text-muted'}`}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setDateFilter('month')}
                >
                  Mês
                </button>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Tipo de Serviço</label>
              <select
                className="form-select shadow-sm rounded-3 py-2 border"
                style={{ fontSize: '0.9rem' }}
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                onClick={handleFilterClick}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <>
                    <Search size={20} />
                    <span>Filtrar</span>
                  </>
                )}
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

      {/* Pagination Controls */}
      {paginationInfo.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-4 mb-5 animate__animated animate__fadeIn">
          <div className="text-muted small">
            A mostrar <span className="fw-bold text-dark">{reports.length}</span> de <span className="fw-bold text-dark">{paginationInfo.total}</span> relatórios
          </div>
          <nav>
            <ul className="pagination pagination-sm m-0 gap-1">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link rounded-3 border-0 shadow-sm" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  Anterior
                </button>
              </li>
              
              {[...Array(paginationInfo.totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Lógica simples para mostrar apenas algumas páginas se houverem muitas
                if (
                  paginationInfo.totalPages > 7 && 
                  pageNum !== 1 && 
                  pageNum !== paginationInfo.totalPages && 
                  Math.abs(pageNum - currentPage) > 2
                ) {
                  if (Math.abs(pageNum - currentPage) === 3) return <li key={pageNum} className="page-item disabled"><span className="page-link border-0 bg-transparent">...</span></li>;
                  return null;
                }

                return (
                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                    <button 
                      className={`page-link rounded-3 border-0 shadow-sm ${currentPage === pageNum ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                      onClick={() => handlePageChange(pageNum)}
                      style={{ padding: '0.5rem 0.75rem', minWidth: '38px', textAlign: 'center' }}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              <li className={`page-item ${currentPage === paginationInfo.totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link rounded-3 border-0 shadow-sm" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  Próximo
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
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
