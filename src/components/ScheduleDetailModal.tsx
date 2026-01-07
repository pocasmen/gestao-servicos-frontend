import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import apiClient, { searchPartByReference } from '../apiClient';
import { ScheduleEvent, Client, Equipment, Technician, PartItem } from '../types';

registerLocale('pt', pt);

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  onScheduleUpdated: (savedSchedule?: ScheduleEvent) => void;
  onManageReport: (event: ScheduleEvent) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ isOpen, onClose, event, onScheduleUpdated, onManageReport }) => {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
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
  const isPastOrCompleted = !isCreating && isCompleted;
  const canComplete = !isCreating && !isCompleted && event && new Date(event.start) <= now;
  const isTicketScheduling = isCreating && !!event?.ticketId;

  useEffect(() => {
    setTitle(event?.title || '');
    setStart(event?.start || new Date());
    setEnd(event?.end || new Date());
    setClientId(event?.clientId !== undefined ? String(event.clientId) : '');
    setEquipmentId(event?.equipmentId !== undefined ? String(event.equipmentId) : '');
    setTechnicianIds(event?.technicians?.map(t => String(t.id)) || []);
    setIsCompleted(event?.isCompleted || false);
    setInternalNotes(event?.internalNotes || '');
    setServiceType(event?.serviceType || (isTicketScheduling ? 'remota' : ''));
    // Para agendamento de ticket novo, não criar linha de peças
    if (isTicketScheduling) {
      setParts([]);
    } else {
      // Garante que há sempre uma linha de peça vazia se não houver peças
      setParts(event?.parts && event.parts.length > 0 ? event.parts : [{ id: undefined, quantity: 1, reference: '', designation: '' }]);
    }
  }, [event, isTicketScheduling]);

  useEffect(() => {
    apiClient.get('/api/clients').then(res => setClients(res.data));
    apiClient.get('/api/technicians').then(res => setTechnicians((res.data || []).filter((t: any) => t.role === 'technician' || t.role === 'admin')));
  }, []);

  useEffect(() => {
    if (clientId && Number(clientId) > 0) {
      apiClient.get(`/api/clients/${Number(clientId)}/equipments`).then(res => setEquipments(res.data));
    } else {
      setEquipments([]);
    }
    // Apenas limpar a seleção de equipamento quando o utilizador altera o cliente
    // Evita limpar no ciclo inicial em que clientId ainda é vazio
    if (event && clientId && String(event.clientId) !== String(clientId)) {
      setEquipmentId('');
    }
  }, [clientId, event]);

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
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Por favor, insira datas e horas válidas para o início e fim do agendamento.');
      return;
    }

    const scheduleData = {
      ...event,
      title,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
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

    try {
      const response = isCreating
        ? await apiClient.post('/api/schedules', scheduleData)
        : await apiClient.put(`/api/schedules/${event!.id}`, scheduleData);
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
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Por favor, insira datas e horas válidas para o início e fim do agendamento.');
      return;
    }

    const scheduleData = { ...event, title, startDate: start.toISOString(), endDate: end.toISOString(), clientId: Number(clientId), equipmentId: Number(equipmentId), technicianIds, isCompleted: true, ticketId: event?.ticketId, internalNotes, serviceType };
    console.log('[DEBUG_SCHEDULE_MODAL] handleComplete - sending:', scheduleData);
    // @ts-ignore
    delete scheduleData.technicians;
    try {
      const response = await apiClient.post(`/api/schedules/${event.id}/complete`, scheduleData);
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
                <label>Título</label>
                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required disabled={isPastOrCompleted} />
              </div>
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
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Início</label>
                    <DatePicker
                      selected={start}
                      onChange={(date: Date | null) => setStart(date || new Date())}
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
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Fim</label>
                    <DatePicker
                      selected={end}
                      onChange={(date: Date | null) => setEnd(date || new Date())}
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
