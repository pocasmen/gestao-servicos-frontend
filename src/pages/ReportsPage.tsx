import React, { useState, useEffect } from 'react';
import apiClient, { createReport, searchPartByReference, createPart, getTechnicians } from '../apiClient';
import { Link } from 'react-router-dom';
import { Report, Client, Equipment, PartItem, Technician } from '../types';
import ReportModal from '../components/ReportModal';
import { Copy, Clipboard } from 'lucide-react';

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

  useEffect(() => {
    apiClient.get('/api/clients').then(res => setClients(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (clientId) {
      apiClient.get(`/api/clients/${clientId}/equipments`).then(res => setEquipments(res.data)).catch(console.error);
    } else {
      setEquipments([]);
    }
    setEquipmentId('');
  }, [clientId]);

  useEffect(() => {
    getTechnicians().then(res => {
      if (Array.isArray(res)) {
        setTechnicians(res.filter((t: any) => t.role !== 'office_staff'));
      } else {
        setTechnicians([]);
      }
    }).catch(() => setTechnicians([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceType || !clientId || !equipmentId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
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
        onReportAdded();
      })
      .catch(console.error);
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

  const handleCopyParts = () => {
    const validParts = parts.filter(p => (p.reference && p.reference.trim() !== '') || (p.designation && p.designation.trim() !== ''));
    if (validParts.length === 0) {
      alert('Não há peças para copiar.');
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
        .then(() => alert('Lista de peças copiada!'))
        .catch(err => {
          console.warn('Clipboard API failed:', err);
          alert('Pronto! Lista guardada na memória interna.');
        });
    } else {
      alert('Pronto! Lista guardada na memória interna.');
    }
  };

  const handlePasteParts = async () => {
    let partsString = localStorage.getItem('app_parts_clipboard');

    if (!partsString && navigator.clipboard && navigator.clipboard.readText) {
      try {
        partsString = await navigator.clipboard.readText();
      } catch (err) {
        console.warn('Could not read clipboard API:', err);
      }
    }

    if (!partsString) {
      alert('Nenhuma peça encontrada para colar.');
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
          alert('Nenhuma peça válida encontrada.');
          return;
        }

        setParts(prev => {
          const filteredPrev = prev.filter(p => p.reference.trim() !== '' || p.designation.trim() !== '');
          return [...filteredPrev, ...newPartsFromPaste, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }];
        });
        alert(`${newPartsFromPaste.length} peças coladas!`);
      } else {
        alert('Conteúdo inválido.');
      }
    } catch (err) {
      console.error('Erro ao colar:', err);
      alert('Erro ao processar as peças.');
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
            {equipments.map(equipment => <option key={equipment.id} value={equipment.id}>{equipment.brand} {equipment.model}</option>)}
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
            <option value="manutencao">Manutenção</option>
            <option value="reparacao">Reparação</option>
            <option value="assistencia">Assistência</option>
            <option value="instalacao">Instalação</option>
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
              <div className="col-1"><button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemovePart(index)}>X</button></div>
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 mt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPart}>Adicionar Peça</button>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                onClick={handleCopyParts}
                title="Copiar Peças"
              >
                <Copy size={14} /> Copiar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                onClick={handlePasteParts}
                title="Colar Peças"
              >
                <Clipboard size={14} /> Colar
              </button>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Descrição da Avaria</label>
          <textarea className="form-control" value={damage} onChange={e => setDamage(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Descrição da Intervenção</label>
          <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-group p-2 bg-light border rounded">
          <label className="text-primary font-weight-bold">Notas Internas (Não visível ao cliente)</label>
          <textarea className="form-control" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Notas para a equipa técnica..." />
        </div>
        <button type="submit" className="btn btn-primary mt-2">Criar Relatório</button>
      </form>
    </div>
  );
};

// Lista de Relatórios
const ReportList: React.FC<{ reports: Report[], onEditReport: (report: Report) => void }> = ({ reports, onEditReport }) => {
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
                <td>{Array.isArray(report.serviceType) ? report.serviceType.join(', ') : report.serviceType}</td>
                <td>{report.hours}</td>
                <td>
                  <Link to={`/report/print/${report.id}`} className="btn btn-sm btn-outline-primary" target="_blank">
                    Ver / Imprimir
                  </Link>
                  <button
                    className="btn btn-sm btn-outline-secondary ms-2"
                    onClick={() => onEditReport(report)}
                  >
                    Editar
                  </button>
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
  const [reports, setReports] = useState<Report[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);

  const fetchReports = () => {
    apiClient.get('/api/reports').then(response => {
      setReports(response.data);
    })
      .catch(console.error);
  };

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

  return (
    <div className="container mt-4">
      <ReportForm onReportAdded={fetchReports} />
      <ReportList reports={reports} onEditReport={handleEditReport} />
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
