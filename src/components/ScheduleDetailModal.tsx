import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import apiClient, { searchPartByReference } from '../apiClient';
import { ScheduleEvent, Client, Equipment, Technician, PartItem, TimeBlock } from '../types';

registerLocale('pt', pt);

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  onScheduleUpdated: (savedSchedule?: ScheduleEvent) => void;
  onManageReport: (event: ScheduleEvent) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ isOpen, onClose, event, onScheduleUpdated, onManageReport }) => {
  const [timeBlocks, setTimeBlocks] = useState<{ start: Date; end: Date }[]>([{ start: new Date(), end: new Date() }]);
  const [clientId, setClientId] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [parts, setParts] = useState<PartItem[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const isCreating = !event || !event.id;
  const now = new Date();

  // Derived start/end for logic checks
  const derivedStart = timeBlocks.length > 0
    ? new Date(Math.min(...timeBlocks.map(b => b.start.getTime())))
    : new Date();

  const isPastOrCompleted = !isCreating && isCompleted;
  const canComplete = !isCreating && !isCompleted && event && new Date(derivedStart) <= now;
  const isTicketScheduling = isCreating && !!event?.ticketId;

  useEffect(() => {
    if (event?.timeBlocks && event.timeBlocks.length > 0) {
      setTimeBlocks(event.timeBlocks.map(tb => ({ start: new Date(tb.start), end: new Date(tb.end) })));
    } else {
      setTimeBlocks([{ start: event?.start || new Date(), end: event?.end || new Date() }]);
    }

    setClientId(event?.clientId !== undefined ? String(event.clientId) : '');
    setEquipmentId(event?.equipmentId !== undefined ? String(event.equipmentId) : '');
    setTechnicianIds(event?.technicians?.map(t => String(t.id)) || []);
    setIsCompleted(event?.isCompleted || false);
    setInternalNotes(event?.internalNotes || '');
    setServiceType(event?.serviceType || (isTicketScheduling ? 'remota' : ''));
    if (isTicketScheduling) {
      setParts([]);
    } else {
      setParts(event?.parts && event.parts.length > 0 ? event.parts : [{ id: undefined, quantity: 1, reference: '', designation: '' }]);
    }
  }, [event, isTicketScheduling]);

  useEffect(() => {
    apiClient.get('/api/clients').then(res => setClients(res.data));
    apiClient.get('/api/technicians').then(res => setTechnicians((res.data || []).filter((t: any) => t.role === 'technician' || t.role === 'office_staff' || t.role === 'admin' || t.role === 'super_admin')));
  }, []);

  useEffect(() => {
    if (clientId) {
      console.log(`[DEBUG] Fetching equipments for client ${clientId}`);
      apiClient.get(`/api/clients/${clientId}/equipments`)
        .then(res => {
          console.log(`[DEBUG] Equipments fetched:`, res.data);
          setEquipments(res.data);
        })
        .catch(err => console.error("Error fetching equipments:", err));
    } else {
      setEquipments([]);
    }
  }, [clientId]);

  // Handle equipment selection logic when equipments list or event changes
  useEffect(() => {
    if (event && event.equipmentId) {
      // If we are editing an event, we want to keep the equipment selected if it exists in the list
      // OR if the list is loading, we might need to wait. 
      // But simpler: if clientId changed by user, clear equipment. 
      // If clientId is same as event, keep equipment.
      if (String(event.clientId) === String(clientId)) {
        setEquipmentId(String(event.equipmentId));
      } else {
        // User changed client, so clear equipment
        setEquipmentId('');
      }
    } else {
      // Creating new event or no equipment set
      // If user manually changed client, we should clear equipment if it doesn't belong to new client?
      // Actually, if simply clientId changed and it's not the initial load matching the event, clear it.
      // We can track if clientId matches event.clientId.

      // Let's simplify: if the current equipmentId is NOT in the new equipments list, clear it.
      // But we need equipments to be loaded first.
      // Effectively, if equipments changed, check if equipmentId is valid.
    }
  }, [clientId, event]); // Simplified logic, real clearing happens in next effect

  useEffect(() => {
    // Validate selected equipment against loaded equipments
    if (equipmentId && equipments.length > 0) {
      const exists = equipments.find(e => String(e.id) === String(equipmentId));
      if (!exists) {
        setEquipmentId('');
      }
    }
  }, [equipments, equipmentId]);

  const handleAddBlock = () => {
    const lastBlock = timeBlocks[timeBlocks.length - 1];
    // Default new block to start 1 hour after the last block ends?
    // Or simply same day?
    // Let's use simple new Date() but maybe aligned if possible.
    setTimeBlocks([...timeBlocks, { start: new Date(), end: new Date() }]);
  };

  const handleRemoveBlock = (index: number) => {
    if (timeBlocks.length <= 1) return;
    setTimeBlocks(timeBlocks.filter((_, i) => i !== index));
  };

  const handleBlockChange = (index: number, field: 'start' | 'end', value: Date | null) => {
    if (!value) return;
    const newBlocks = [...timeBlocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setTimeBlocks(newBlocks);
  };

  const handleTechnicianChange = (technicianId: string) => {
    setTechnicianIds(prevIds =>
      prevIds.includes(technicianId)
        ? prevIds.filter(id => id !== technicianId)
        : [...prevIds, technicianId]
    );
  };

  const handleAddPart = () => {
    setParts([...parts, { id: undefined, quantity: 1, reference: '', designation: '' }]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  };

  const handlePartChange = (index: number, field: keyof PartItem, value: string | number) => {
    const newParts = [...parts];
    (newParts[index] as any)[field] = value;
    setParts(newParts);
  };

  const handleReferenceBlur = async (index: number) => {
    const reference = parts[index].reference;
    console.log('[DEBUG] handleReferenceBlur called for index:', index, 'reference:', reference);

    if (typeof reference === 'string' && reference.trim() !== '') {
      try {
        console.log('[DEBUG] Searching for part with reference:', reference.trim());
        const part = await searchPartByReference(reference.trim());
        console.log('[DEBUG] Search result:', part);

        const newParts = [...parts];
        if (part) {
          newParts[index].id = part.id;
          newParts[index].designation = part.designation;
          newParts[index].isDesignationLocked = true;
          console.log('[DEBUG] Part found, updating designation to:', part.designation);
        } else {
          newParts[index].id = undefined;
          newParts[index].designation = '';
          newParts[index].isDesignationLocked = false;
          console.log('[DEBUG] Part not found, clearing designation');
        }
        setParts(newParts);
      } catch (error) {
        console.error('[ERROR] Error searching for part:', error);
      }
    }
  };



  const handleSave = async () => {
    const equipIdNum = Number(equipmentId);
    const isValidEquip = equipments.some(eq => Number(eq.id) === equipIdNum);
    if (!isValidEquip) {
      alert('O equipamento selecionado não corresponde a um equipamento válido do cliente.');
      return;
    }
    if (event?.ticketId && event?.equipmentId && equipIdNum !== Number(event.equipmentId)) {
      alert('O equipamento selecionado não corresponde ao equipamento do ticket.');
      return;
    }
    if (!Array.isArray(technicianIds) || technicianIds.length === 0) {
      alert('É obrigatório selecionar pelo menos um técnico/admin.');
      return;
    }

    if (timeBlocks.length === 0) {
      alert('É obrigatório definir pelo menos um bloco de horário.');
      return;
    }

    const sTime = new Date(Math.min(...timeBlocks.map(b => b.start.getTime())));
    const eTime = new Date(Math.max(...timeBlocks.map(b => b.end.getTime())));

    if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
      alert('Por favor, insira datas e horas válidas para o início e fim do agendamento.');
      return;
    }

    const scheduleData = {
      ...event,
      startDate: sTime.toISOString(),
      endDate: eTime.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      parts: parts
        .filter(p => p.quantity > 0 && p.reference && p.reference.trim() !== '')
        .map(p => ({
          id: p.id,
          reference: p.reference,
          designation: p.designation,
          quantity: p.quantity
        })),
    };
    console.log('[DEBUG_SCHEDULE_MODAL] handleSave - sending:', scheduleData);
    // @ts-ignore
    delete scheduleData.technicians;
    // @ts-ignore
    delete scheduleData.scheduleId;
    // @ts-ignore
    delete scheduleData.id;

    // Determine correct ID for PUT
    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    try {
      const response = isCreating
        ? await apiClient.post('/api/schedules', scheduleData)
        : await apiClient.put(`/api/schedules/${scheduleId}`, scheduleData);
      console.log('[DEBUG_SCHEDULE_MODAL] handleSave - response:', response.data);
      onScheduleUpdated(response.data);
      onClose();
    } catch (error) {
      console.error("Erro ao guardar agendamento:", error);
      alert('Ocorreu um erro ao guardar o agendamento.');
    }
  };

  const handleComplete = async () => {
    if (!event) return;
    const equipIdNum = Number(equipmentId);
    const isValidEquip = equipments.some(eq => Number(eq.id) === equipIdNum);
    if (!isValidEquip) {
      alert('O equipamento selecionado não corresponde a um equipamento válido do cliente.');
      return;
    }
    if (event?.ticketId && event?.equipmentId && equipIdNum !== Number(event.equipmentId)) {
      alert('O equipamento selecionado não corresponde ao equipamento do ticket.');
      return;
    }
    if (!Array.isArray(technicianIds) || technicianIds.length === 0) {
      alert('É obrigatório selecionar pelo menos um técnico/admin.');
      return;
    }

    const sTime = new Date(Math.min(...timeBlocks.map(b => b.start.getTime())));
    const eTime = new Date(Math.max(...timeBlocks.map(b => b.end.getTime())));

    if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
      alert('Por favor, insira datas e horas válidas.');
      return;
    }

    const scheduleData = {
      ...event,
      startDate: sTime.toISOString(),
      endDate: eTime.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted: true,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() }))
    };
    console.log('[DEBUG_SCHEDULE_MODAL] handleComplete - sending:', scheduleData);
    // @ts-ignore
    delete scheduleData.technicians;

    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    try {
      const response = await apiClient.post(`/api/schedules/${scheduleId}/complete`, scheduleData);
      console.log('[DEBUG_SCHEDULE_MODAL] handleComplete - response:', response.data);
      onScheduleUpdated(response.data);
      onClose();
    } catch (error) {
      console.error("Erro ao concluir o serviço:", error);
      alert('Ocorreu um erro ao concluir o serviço.');
    }
  };

  const handleDelete = () => {
    if (!event) return;
    if (window.confirm("Tem a certeza que quer eliminar este agendamento?")) {
      apiClient.delete(`/api/schedules/${event.id}`)
        .then(() => {
          onScheduleUpdated();
          onClose();
        })
        .catch((error: any) => {
          console.error("Erro ao eliminar agendamento:", error);
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  if (!isOpen) return null;

  return (
    <div className="modal show fade" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{isCreating ? 'Novo Agendamento' : 'Detalhes do Agendamento'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de Serviço</label>
                <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} disabled={isPastOrCompleted}>
                  <option value="">Selecione um tipo...</option>
                  <option value="reparacao">Reparação</option>
                  <option value="instalacao">Instalação</option>
                  <option value="assistencia">Assistência</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="remota">Remota</option>
                </select>
              </div>
              <div className="form-group mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label>Horários do Serviço</label>
                  {!isPastOrCompleted && (
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddBlock}>
                      + Adicionar Horário
                    </button>
                  )}
                </div>

                {timeBlocks.map((block, index) => (
                  <div key={index} className="row mb-3 align-items-end border-bottom pb-3">
                    <div className="col-md-5">
                      <div className="form-group mb-0">
                        <label className="small text-muted">Início ({index + 1})</label>
                        <DatePicker
                          selected={block.start}
                          onChange={(date: Date | null) => handleBlockChange(index, 'start', date)}
                          showTimeSelect
                          dateFormat="dd/MM/yyyy HH:mm"
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          locale="pt"
                          className="form-control"
                          disabled={isPastOrCompleted}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-5">
                      <div className="form-group mb-0">
                        <label className="small text-muted">Fim ({index + 1})</label>
                        <DatePicker
                          selected={block.end}
                          onChange={(date: Date | null) => handleBlockChange(index, 'end', date)}
                          showTimeSelect
                          dateFormat="dd/MM/yyyy HH:mm"
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          locale="pt"
                          className="form-control"
                          disabled={isPastOrCompleted}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      {!isPastOrCompleted && timeBlocks.length > 1 && (
                        <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => handleRemoveBlock(index)}>
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} required disabled={isPastOrCompleted}>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Equipamento</label>
                <select className="form-control" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required disabled={isPastOrCompleted || !clientId}>
                  <option value="">Selecione um equipamento...</option>
                  {equipments.map(eq => (
                    <option key={eq.id} value={String(eq.id)}>
                      {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Técnico(s)</label>
                <div className="technician-checkbox-group p-2 border rounded">
                  <div className="row">
                    {technicians.length === 0 ? (
                      <div className="col-12"><small className="text-muted">Nenhum técnico/admin disponível.</small></div>
                    ) : (
                      technicians.map(t => (
                        <div className="col-4" key={t.id}>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`tech-${t.id}`}
                              value={t.id}
                              checked={technicianIds.includes(String(t.id))}
                              onChange={() => handleTechnicianChange(String(t.id))}
                              disabled={isPastOrCompleted}
                            />
                            <label className="form-check-label" htmlFor={`tech-${t.id}`}>
                              {t.name}
                            </label>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Secção de Peças (oculta para agendamento de ticket recém-criado) */}
              {!isTicketScheduling && (
                <div className="form-group mt-3">
                  <label>Peças a Utilizar</label>
                  <div className="p-2 border rounded">
                    {parts.map((part, index) => (
                      <div key={index} className="row mb-2 align-items-center">
                        <div className="col-2">
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Qtd"
                            value={part.quantity}
                            onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            disabled={isPastOrCompleted}
                          />
                        </div>
                        <div className="col-4">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Referência"
                            value={part.reference}
                            onChange={e => handlePartChange(index, 'reference', e.target.value)}
                            onBlur={() => handleReferenceBlur(index)}
                            disabled={isPastOrCompleted}
                          />
                        </div>
                        <div className="col-5">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Designação"
                            value={part.designation}
                            onChange={e => handlePartChange(index, 'designation', e.target.value)}
                            disabled={part.isDesignationLocked || isPastOrCompleted}
                          />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemovePart(index)} disabled={isPastOrCompleted}>X</button>
                        </div>
                      </div>
                    ))}
                    {!isPastOrCompleted && (
                      <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={handleAddPart}>
                        Adicionar Peça
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isTicketScheduling && (
                <div className="form-group">
                  <label>Notas Internas</label>
                  <textarea
                    className="form-control"
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={3}
                    disabled={isPastOrCompleted}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer d-flex justify-content-between">
              <div>
                {!isCreating && <button type="button" className="btn btn-danger" onClick={handleDelete}>Eliminar</button>}
              </div>
              <div>
                <button type="button" className="btn btn-secondary me-2" onClick={onClose}>Cancelar</button>
                {!isPastOrCompleted && <button type="submit" className="btn btn-primary">{isCreating ? 'Criar' : 'Guardar'}</button>}
                {canComplete && <button type="button" className="btn btn-success ms-2" onClick={handleComplete}>Concluir Serviço</button>}
                {isCompleted && (
                  <button type="button" className="btn btn-info ms-2" onClick={() => onManageReport(event!)}>
                    {event?.hasReport ? 'Ver / Editar Relatório' : 'Criar Relatório'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;
