import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import { AuthContext } from '../App';
import { Client, Equipment, ScheduleEvent, PartItem, Report, Technician } from '../types';
import SignaturePad from './SignaturePad';


interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleEvent | null; // Agendamento base para o relatório
  reportToEdit: Report | null; // Relatório existente para editar
  onReportSaved: () => void; // Callback unificado
}

const serviceTypesAvailable = [
  { id: 'reparacao', label: 'Reparação' },
  { id: 'instalacao', label: 'Instalação' },
  { id: 'assistencia', label: 'Assistência' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'remota', label: 'Remota' },
];

// Função para calcular horas trabalhadas com desconto de almoço e arredondamento para cima
const calculateHours = (start: Date, end: Date): number => {
  let diffMs = end.getTime() - start.getTime(); // Diferença em milissegundos
  let diffHours = diffMs / (1000 * 60 * 60); // Diferença em horas

  // Verificar se o intervalo de almoço (13h-14h) está dentro do período do serviço
  const lunchStart = new Date(start);
  lunchStart.setHours(13, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(14, 0, 0, 0);

  // Se o serviço começa antes ou durante o almoço e termina depois ou durante o almoço
  if (start < lunchEnd && end > lunchStart) {
    // Calcular a sobreposição do almoço
    const overlapStart = Math.max(start.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(end.getTime(), lunchEnd.getTime());
    if (overlapEnd > overlapStart) {
      const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      diffHours -= overlapHours; // Subtrai apenas a sobreposição
    }
  }

  // Arredondar para cima para o número inteiro mais próximo
  return Math.max(0, Math.ceil(diffHours)); // Garantir que não é negativo
};

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  schedule,
  reportToEdit,
  onReportSaved
}) => {
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [parts, setParts] = useState<PartItem[]>([{ quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
  const [damage, setDamage] = useState(''); // Novo campo
  const [description, setDescription] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]); // Alterado para array
  const [internalNotes, setInternalNotes] = useState(''); // Novo campo interno
  const [signature, setSignature] = useState<string | undefined>(undefined);
  const [technicianSignature, setTechnicianSignature] = useState<string | undefined>(undefined);

  const { user: authUser } = useContext(AuthContext);


  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientEquipments, setClientEquipments] = useState<Equipment[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);

  const isEditing = reportToEdit !== null;

  useEffect(() => {
    apiClient.get('/api/clients').then(res => setAllClients(res.data));
    apiClient.get('/api/technicians').then(res => setAllTechnicians(res.data));
  }, []);

  useEffect(() => {
    if (isEditing && reportToEdit) {
      // Modo de Edição: preencher com dados do relatório
      setClientId(reportToEdit.clientId);
      setEquipmentId(reportToEdit.equipmentId);
      setTechnicianIds(reportToEdit.technicians?.map(t => t.id) || []); // Pre-fill from report
      setServiceDate(new Date(reportToEdit.serviceDate).toISOString().slice(0, 16));
      setHours(reportToEdit.hours);
      setDescription(reportToEdit.description);
      setDamage(reportToEdit.damage || ''); // Carregar damage
      setServiceTypes(reportToEdit.serviceType || []); // Carregar array
      setInternalNotes(reportToEdit.internalNotes || ''); // Carregar notas internas
      const loadedParts = reportToEdit.parts && reportToEdit.parts.length > 0 ? reportToEdit.parts : [];
      setParts([...loadedParts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
      setSignature(reportToEdit.signature);
      setTechnicianSignature(reportToEdit.technician_signature);


    } else if (!isEditing && schedule) {
      // Modo de Criação: preencher com dados do agendamento
      setClientId(schedule.clientId);
      setEquipmentId(schedule.equipmentId);
      setTechnicianIds(schedule.technicians?.map(t => t.id) || []); // Pre-fill from schedule
      setServiceDate(new Date(schedule.start!).toISOString().slice(0, 16));

      let totalCalculatedHours = 0;
      if (schedule.timeBlocks && schedule.timeBlocks.length > 0) {
        schedule.timeBlocks.forEach(block => {
          totalCalculatedHours += calculateHours(new Date(block.start), new Date(block.end));
        });
      } else {
        totalCalculatedHours = calculateHours(new Date(schedule.start!), new Date(schedule.end!));
      }
      setHours(totalCalculatedHours);

      const scheduledParts = (schedule.parts || []).map(p => ({
        ...p,
        isDesignationLocked: !!p.designation
      }));

      setParts([...scheduledParts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);

      setDescription('');
      setDamage(''); // Inicializar vazio

      // Passar o tipo de serviço do agendamento para o relatório (se existir)
      if (schedule.serviceType) {
        setServiceTypes([schedule.serviceType]);
      } else {
        setServiceTypes([]);
      }

      // Passar as notas internas do agendamento para o relatório
      setInternalNotes(schedule.internalNotes || '');
      setSignature(undefined);

      // Buscar assinatura do técnico logado para inclusão automática
      if (authUser) {
        apiClient.get('/api/technicians').then(res => {
          const profile = res.data.find((p: any) => p.id === authUser.id);
          if (profile && profile.signature) {
            setTechnicianSignature(profile.signature);
          }
        });
      }
    }

  }, [schedule, reportToEdit, isEditing]);

  useEffect(() => {
    if (clientId) {
      apiClient.get(`/api/clients/${clientId}/equipments`).then(res => setClientEquipments(res.data));
    } else {
      setClientEquipments([]);
    }
  }, [clientId]);

  if (!isOpen) return null;

  const handlePartChange = (index: number, field: keyof PartItem, value: any) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };

    if (field === 'reference') {
      newParts[index].isDesignationLocked = false;
    }

    setParts(newParts);

    if (index === parts.length - 1 && (newParts[index].reference || newParts[index].designation)) {
      setParts([...newParts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
    }
  };

  const handleReferenceBlur = async (index: number) => {
    const part = parts[index];
    if (part.reference) {
      try {
        const response = await apiClient.get(`/api/parts/${part.reference}`);
        const newParts = [...parts];
        newParts[index] = { ...newParts[index], designation: response.data.designation, isDesignationLocked: true };
        setParts(newParts);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          const newParts = [...parts];
          newParts[index] = { ...newParts[index], designation: '', isDesignationLocked: false };
          setParts(newParts);
        } else {
          console.error("Erro ao verificar referência:", error);
        }
      }
    }
  };

  const handleRemovePart = (index: number) => {
    if (parts.length === 1) {
      setParts([{ quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
    } else {
      setParts(parts.filter((_, i) => i !== index));
    }
  };

  const handleServiceTypeChange = (type: string) => {
    setServiceTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleTechnicianChange = (technicianId: string) => {
    setTechnicianIds(prevIds =>
      prevIds.includes(technicianId)
        ? prevIds.filter(id => id !== technicianId)
        : [...prevIds, technicianId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const partsToSubmit = parts.filter(p => p.reference || p.designation);


    for (const part of partsToSubmit) {
      if (part.reference && part.designation && !part.isDesignationLocked) {
        try {
          await apiClient.post('/api/inventory', { reference: part.reference, designation: part.designation });
        } catch (error) {
          console.error("Erro ao criar nova peça:", error);
        }
      }
    }

    const reportData = {
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      scheduleId: isEditing
        ? reportToEdit.scheduleId
        : (schedule?.scheduleId || (typeof schedule?.id === 'number' ? schedule.id : undefined)),
      technicianIds: technicianIds,
      serviceDate,
      hours: Number(hours),
      parts: partsToSubmit,
      description,
      damage, // Incluir o novo campo
      serviceType: serviceTypes, // Enviar o array
      internalNotes, // Enviar notas internas
      signature, // Enviar assinatura
      technician_signature: technicianSignature // Enviar assinatura do técnico
    };


    const saveRequest = isEditing
      ? apiClient.put(`/api/reports/${reportToEdit.id}`, reportData)
      : apiClient.post('/api/reports', reportData);

    saveRequest
      .then(() => {
        onReportSaved();
        onClose();
      })
      .catch((err: any) => {
        console.error("Erro ao guardar relatório:", err);
        console.error("Detalhes do erro:", err.response || err.message);
        const errorMessage = err.response?.data?.error || "Erro ao guardar relatório.";
        alert(errorMessage);
      });
  };

  return (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{isEditing ? 'Editar Relatório de Intervenção' : 'Criar Relatório de Intervenção'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {/* ... form fields ... */}
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={clientId} onChange={e => setClientId(Number(e.target.value))} required>
                  <option value="">Selecione um cliente...</option>
                  {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Equipamento</label>
                <select className="form-control" value={equipmentId} onChange={e => setEquipmentId(Number(e.target.value))} required disabled={!clientId}>
                  <option value="">Selecione um equipamento...</option>
                  {clientEquipments.map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Técnico(s) Responsável(eis)</label>
                <div className="technician-checkbox-group p-2 border rounded">
                  <div className="row">
                    {allTechnicians.map(t => (
                      <div className="col-4" key={t.id}>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`report-tech-${t.id}`}
                            value={t.id}
                            checked={technicianIds.includes(t.id)}
                            onChange={() => handleTechnicianChange(t.id)}
                          />
                          <label className="form-check-label" htmlFor={`report-tech-${t.id}`}>
                            {t.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Tipo de Serviço</label>
                <div className="d-flex flex-wrap">
                  {serviceTypesAvailable.map(type => (
                    <div key={type.id} className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`service-type-${type.id}`}
                        checked={serviceTypes.includes(type.id)}
                        onChange={() => handleServiceTypeChange(type.id)}
                      />
                      <label className="form-check-label" htmlFor={`service-type-${type.id}`}>{type.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Data e Hora do Serviço</label>
                <input type="datetime-local" className="form-control" value={serviceDate} onChange={e => setServiceDate(e.target.value)} required />
              </div>

              {schedule?.timeBlocks && schedule.timeBlocks.length > 0 && (
                <div className="alert alert-info py-1 px-2 mt-2" style={{ fontSize: '0.85rem' }}>
                  <strong>Blocos de Horário do Agendamento:</strong>
                  <ul className="mb-0 ps-3">
                    {schedule.timeBlocks.map((tb, idx) => (
                      <li key={idx}>
                        {new Date(tb.start).toLocaleDateString('pt-PT')} das {new Date(tb.start).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} às {new Date(tb.end).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="form-group">
                <label>Horas Trabalhadas</label>
                <input type="number" className="form-control" value={hours} onChange={e => setHours(Number(e.target.value))} required min="0" step="1" />
              </div>

              <div className="form-group">
                <label>Descrição da Avaria</label>
                <textarea className="form-control" value={damage} onChange={e => setDamage(e.target.value)} rows={2}></textarea>
              </div>

              <div className="form-group">
                <label>Descrição da Intervenção</label>
                <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={2} required></textarea>
              </div>

              <div className="form-group p-2 bg-light border rounded">
                <label className="text-primary font-weight-bold">Notas Internas (Não visível ao cliente)</label>
                <textarea className="form-control" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Notas para a equipa técnica..."></textarea>
              </div>

              <div className="form-group mt-3">
                <label>Peças Utilizadas</label>
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>Qt</th>
                      <th style={{ width: '15%' }}>Referência</th>
                      <th>Designação</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((part, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={part.quantity}
                            onChange={e => handlePartChange(index, 'quantity', Number(e.target.value))}
                            min="1"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={part.reference}
                            onChange={e => handlePartChange(index, 'reference', e.target.value)}
                            onBlur={() => handleReferenceBlur(index)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={part.designation}
                            onChange={e => handlePartChange(index, 'designation', e.target.value)}
                            disabled={part.isDesignationLocked}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRemovePart(index)}
                            title="Remover Peça"
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-group mt-4">
                <SignaturePad
                  onConfirm={(dataUrl) => setSignature(dataUrl)}
                  onClear={() => setSignature(undefined)}
                  initialSignature={signature}
                />

                {signature && (
                  <div className="alert alert-success mt-2 py-1 px-2 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Assinatura capturada com sucesso!
                  </div>
                )}
              </div>



            </div>
            <div className="modal-footer">
              {isEditing && reportToEdit && (
                <button
                  type="button"
                  className="btn btn-outline-primary me-auto"
                  onClick={() => window.open(`/report/print/${reportToEdit.id}`, '_blank')}
                >
                  <i className="bi bi-printer me-2"></i>Ver Relatório
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{isEditing ? 'Guardar Alterações' : 'Criar Relatório'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
