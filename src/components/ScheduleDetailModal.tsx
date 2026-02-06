import React, { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import apiClient, { searchPartByReference } from '../apiClient';
import { ScheduleEvent, Client, Equipment, Technician, PartItem, TimeBlock } from '../types';
import { StockType, UserRole, ServiceClassification } from '../constants/enums';
import { SERVICE_TYPES_LIST, SERVICE_CLASSIFICATIONS_LIST } from '../constants';
import { Copy, Clipboard, Trash2 } from 'lucide-react';
import { useConfirm, ConfirmOptions } from '../contexts/ConfirmContext';
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
  const [includesTravel, setIncludesTravel] = useState(false);
  const [classification, setClassification] = useState<ServiceClassification>(ServiceClassification.GERAL);
  const internalNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (internalNotesRef.current) {
      internalNotesRef.current.style.height = 'auto';
      internalNotesRef.current.style.height = `${internalNotesRef.current.scrollHeight}px`;
    }
  }, [internalNotes, isOpen]);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState<string>('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const isCreating = !event || !event.id;
  const now = new Date();
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setClientSearch(event?.clientName || '');
    setEquipmentId(event?.equipmentId !== undefined ? String(event.equipmentId) : '');
    setTechnicianIds(event?.technicians?.map(t => String(t.id)) || []);
    setIsCompleted(event?.isCompleted || false);
    setInternalNotes(event?.internalNotes || '');
    setServiceType(event?.serviceType || (isTicketScheduling ? 'remota' : ''));
    setIncludesTravel(event?.includes_travel || false);
    setClassification(event?.classification || ServiceClassification.GERAL);
    if (isTicketScheduling) {
      setParts([]);
    } else {
      setParts(event?.parts || []);
    }
  }, [event, isTicketScheduling]);

  useEffect(() => {
    apiClient.get('/api/clients').then(res => setClients(res.data));
    apiClient.get('/api/technicians').then(res => setTechnicians((res.data || []).filter((t: any) => t.role === UserRole.TECHNICIAN || t.role === UserRole.ADMIN || t.role === UserRole.SUPER_ADMIN)));
  }, []);

  useEffect(() => {
    if (clientId) {
      setIsLoadingEquipments(true);
      console.log(`[DEBUG] Fetching equipments for client ${clientId}`);
      apiClient.get(`/api/clients/${clientId}/equipments`)
        .then(res => {
          if (import.meta.env.DEV) {
            console.log(`[DEBUG] Equipments fetched:`, res.data);
          }
          setEquipments(res.data);
        })
        .catch(err => console.error("Error fetching equipments:", err))
        .finally(() => setIsLoadingEquipments(false));
    } else {
      setEquipments([]);
    }
  }, [clientId]);

  // Sync clientSearch with clientId when clients are loaded or clientId changes
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => String(c.id) === String(clientId));
      if (client && client.name !== clientSearch) {
        setClientSearch(client.name);
      }
    }
  }, [clientId, clients]);

  // Sync clientId with clientSearch when user types with Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (clientSearch && clients.length > 0) {
        const selectedClient = clients.find(c => c.name.toLowerCase() === clientSearch.toLowerCase().trim());
        if (selectedClient) {
          if (String(selectedClient.id) !== clientId) {
            setClientId(String(selectedClient.id));
          }
        } else {
          // Só limpa o ID se o utilizador apagou o texto ou escreveu algo que não existe
          // E garantimos que não estamos num estado de "loading" inicial
          if (clientId !== '') {
            setClientId('');
          }
        }
      } else if (!clientSearch && clientId !== '') {
        setClientId('');
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch, clients, clientId]);

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

  const handlePartChange = (index: number, field: keyof PartItem, value: string | number | boolean) => {
    const newParts = [...parts];
    const item = { ...newParts[index] };

    if (field === 'quantity') {
      item.quantity = Number(value);
    } else if (field === 'isDesignationLocked') {
      // isDesignationLocked is boolean, but value is string|number here? 
      // The signature says value: string | number. 
      // Checking usage: handlePartChange(index, 'isDesignationLocked', ...) is not called in the code provided in previous turn, but let's be safe.
      // Actually, looking at the code, it's capable of receiving boolean too if I change the signature?
      // The component calls it with: handlePartChange(index, 'quantity', parseInt...)
      // handlePartChange(index, 'reference', e.target.value)
      // handlePartChange(index, 'designation', e.target.value)
      // It does NOT seem to call it for isDesignationLocked.
    } else {
      // reference, designation are strings
      (item as any)[field] = value;
    }
    // Wait, let's just use the spread which is standard React pattern, TS might complain about union type mismatch
    // simpler:
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  const handleReferenceBlur = async (index: number) => {
    const reference = parts[index].reference;
    if (import.meta.env.DEV) {
      console.log('[DEBUG] handleReferenceBlur called for index:', index, 'reference:', reference);
    }

    if (typeof reference === 'string' && reference.trim() !== '') {
      try {
        if (import.meta.env.DEV) {
          console.log('[DEBUG] Searching for part with reference:', reference.trim());
        }
        const part = await searchPartByReference(reference.trim());
        if (import.meta.env.DEV) {
          console.log('[DEBUG] Search result:', part);
        }

        const newParts = [...parts];
        if (part) {
          newParts[index].id = part.id;
          newParts[index].designation = part.designation;
          newParts[index].isDesignationLocked = true;
          newParts[index].stock_quantity = part.stock_quantity;
          newParts[index].reserved_quantity = part.reserved_quantity;
          newParts[index].stock_quantity_contract = part.stock_quantity_contract;
          newParts[index].reserved_quantity_contract = part.reserved_quantity_contract;
          if (import.meta.env.DEV) {
            console.log('[DEBUG] Part found, updating designation to:', part.designation);
          }
        } else {
          newParts[index].id = undefined;
          newParts[index].designation = '';
          newParts[index].isDesignationLocked = false;
          if (import.meta.env.DEV) {
            console.log('[DEBUG] Part not found, clearing designation');
          }
        }
        setParts(newParts);
      } catch (error) {
        console.error('[ERROR] Error searching for part:', error);
      }
    }
  };

  const { confirm, alert } = useConfirm();

  // ... (inside various handlers)

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

    // Guardar no localStorage (mais fiável em mobile/Android)
    localStorage.setItem('app_parts_clipboard', partsString);

    // Tentar guardar também na área de transferência do sistema
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(partsString)
        .then(async () => await alert('Lista de peças copiada!'))
        .catch(async (err) => {
          console.warn('Clipboard API failed, using internal memory only.', err);
          await alert('Lista de peças guardada na memória interna!');
        });
    } else {
      await alert('Lista de peças guardada na memória interna!');
    }
  };

  const handlePasteParts = async () => {
    let partsString = localStorage.getItem('app_parts_clipboard');

    // Se não estiver no localStorage, tentar ler do clipboard do sistema
    if (!partsString && navigator.clipboard && navigator.clipboard.readText) {
      try {
        partsString = await navigator.clipboard.readText();
      } catch (err) {
        console.warn('Could not read from clipboard API:', err);
      }
    }

    if (!partsString) {
      await alert('Nenhuma peça encontrada na memória ou área de transferência.');
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
          return [...filteredPrev, ...newPartsFromPaste];
        });
        await alert(`${newPartsFromPaste.length} peças coladas!`);
      } else {
        await alert('Conteúdo inválido.');
      }
    } catch (err) {
      console.error('Erro ao colar:', err);
      await alert('Erro ao processar as peças. Certifique-se que copiou uma lista válida.');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!clientId) {
      await alert('É obrigatório selecionar um cliente.');
      return;
    }
    const equipIdNum = Number(equipmentId);
    const isValidEquip = equipments.some(eq => Number(eq.id) === equipIdNum);
    if (!isValidEquip) {
      await alert('O equipamento selecionado não corresponde a um equipamento válido do cliente.');
      return;
    }
    if (event?.ticketId && event?.equipmentId && equipIdNum !== Number(event.equipmentId)) {
      await alert('O equipamento selecionado não corresponde ao equipamento do ticket.');
      return;
    }
    if (!Array.isArray(technicianIds) || technicianIds.length === 0) {
      await alert('É obrigatório selecionar pelo menos um técnico/admin.');
      return;
    }

    if (!serviceType) {
      await alert('É obrigatório selecionar um tipo de serviço.');
      return;
    }

    if (timeBlocks.length === 0) {
      await alert('É obrigatório definir pelo menos um bloco de horário.');
      return;
    }

    const sTime = new Date(Math.min(...timeBlocks.map(b => b.start.getTime())));
    const eTime = new Date(Math.max(...timeBlocks.map(b => b.end.getTime())));

    if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
      await alert('Por favor, insira datas e horas válidas para o início e fim do agendamento.');
      return;
    }

    // Safe destructuring of event to preserve extra props but exclude what we overwrite or don't want
    let eventRest: Partial<ScheduleEvent> = {};
    if (event) {
      const { technicians, scheduleId: _sId, id: _id, ...rest } = event;
      eventRest = rest;
    }

    // Validação de stock insuficiente
    const partsToValidate = parts.filter(p => p.quantity > 0 && p.reference && p.reference.trim() !== '');
    const negativeStockParts = partsToValidate.filter(p => {
      if (p.stockType === StockType.CLIENT || p.stockType === StockType.WARRANTY) return false;
      const type = p.stockType || StockType.GENERAL;
      if (type === StockType.GENERAL) {
        const available = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
        return available < p.quantity;
      } else {
        const available = (p.stock_quantity_contract || 0) - (p.reserved_quantity_contract || 0);
        return available < p.quantity;
      }
    });

    if (negativeStockParts.length > 0) {
      const partNames = negativeStockParts.map(p => p.designation || p.reference).join(', ');
      const proceed = await confirm({
        title: 'Aviso de Stock Insuficiente',
        message: `As seguintes peças ficarão com stock negativo: ${partNames}. Gostaria de continuar?`,
        variant: 'warning',
        confirmText: 'Continuar',
        cancelText: 'Cancelar'
      } as ConfirmOptions);
      if (!proceed) return;
    }

    const scheduleData = {
      ...eventRest,
      startDate: sTime.toISOString(),
      endDate: eTime.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
      includesTravel,
      classification,
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      parts: parts
        .filter(p => p.quantity > 0 && p.reference && p.reference.trim() !== '')
        .map(p => ({
          id: p.id,
          reference: p.reference,
          designation: p.designation,
          quantity: p.quantity,
          stockType: p.stockType || StockType.GENERAL,
          isApplied: p.isApplied === false ? false : true
        })),
    };

    if (import.meta.env.DEV) {
      console.log('[DEBUG_SCHEDULE_MODAL] handleSave - sending:', scheduleData);
    }

    // Determine correct ID for PUT
    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    setIsSubmitting(true);
    try {
      const response = isCreating
        ? await apiClient.post('/api/schedules', scheduleData)
        : await apiClient.put(`/api/schedules/${scheduleId}`, scheduleData);

      if (import.meta.env.DEV) {
        console.log('[DEBUG_SCHEDULE_MODAL] handleSave - response:', response.data);
      }
      onScheduleUpdated(response.data);
      onClose();
    } catch (error) {
      console.error("Erro ao guardar agendamento:", error);
      await alert('Ocorreu um erro ao guardar o agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!event || isSubmitting) return;
    if (!clientId) {
      await alert('É obrigatório selecionar um cliente.');
      return;
    }
    const equipIdNum = Number(equipmentId);
    const isValidEquip = equipments.some(eq => Number(eq.id) === equipIdNum);
    if (!isValidEquip) {
      await alert('O equipamento selecionado não corresponde a um equipamento válido do cliente.');
      return;
    }
    if (event?.ticketId && event?.equipmentId && equipIdNum !== Number(event.equipmentId)) {
      await alert('O equipamento selecionado não corresponde ao equipamento do ticket.');
      return;
    }
    if (!Array.isArray(technicianIds) || technicianIds.length === 0) {
      await alert('É obrigatório selecionar pelo menos um técnico/admin.');
      return;
    }

    if (!serviceType) {
      await alert('É obrigatório selecionar um tipo de serviço.');
      return;
    }

    const sTime = new Date(Math.min(...timeBlocks.map(b => b.start.getTime())));
    const eTime = new Date(Math.max(...timeBlocks.map(b => b.end.getTime())));

    if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
      await alert('Por favor, insira datas e horas válidas.');
      return;
    }

    let eventRestForComplete: Partial<ScheduleEvent> = {};
    if (event) {
      const { technicians, ...rest } = event;
      eventRestForComplete = rest;
    }

    const scheduleData = {
      ...eventRestForComplete,
      startDate: sTime.toISOString(),
      endDate: eTime.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted: true,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
      includesTravel,
      classification,
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() }))
    };

    if (import.meta.env.DEV) {
      console.log('[DEBUG_SCHEDULE_MODAL] handleComplete - sending:', scheduleData);
    }

    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/api/schedules/${scheduleId}/complete`, scheduleData);
      if (import.meta.env.DEV) {
        console.log('[DEBUG_SCHEDULE_MODAL] handleComplete - response:', response.data);
      }
      onScheduleUpdated(response.data);
      onClose();
    } catch (error) {
      console.error("Erro ao concluir o serviço:", error);
      await alert('Ocorreu um erro ao concluir o serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || isSubmitting) return;
    if (await confirm({
      message: "Tem a certeza que quer eliminar este agendamento?",
      title: 'Eliminar Agendamento',
      variant: 'danger',
      confirmText: 'Eliminar'
    })) {
      const scheduleId = event.scheduleId || (typeof event.id === 'number' ? event.id : undefined);
      if (!scheduleId) {
        await alert("Não foi possível identificar o agendamento para eliminar.");
        return;
      }

      setIsSubmitting(true);
      apiClient.delete(`/api/schedules/${scheduleId}`)
        .then(() => {
          onScheduleUpdated();
          onClose();
        })
        .catch((error: any) => {
          console.error("Erro ao eliminar agendamento:", error);
        })
        .finally(() => {
          setIsSubmitting(false);
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
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="text-secondary fw-bold">Tipo de Serviço</label>
                    <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} disabled={isPastOrCompleted}>
                      <option value="">Selecione um tipo...</option>
                      {SERVICE_TYPES_LIST.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="text-secondary fw-bold">Classificação</label>
                    <select className="form-control" value={classification} onChange={e => setClassification(e.target.value as ServiceClassification)} disabled={isPastOrCompleted}>
                      {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {/* Checkbox de Deslocação - Oculto para serviços remotos */}
              {serviceType && serviceType !== 'remota' && (
                <div className="form-group">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includesTravel"
                      checked={includesTravel}
                      onChange={(e) => setIncludesTravel(e.target.checked)}
                      disabled={isPastOrCompleted}
                    />
                    <label className="form-check-label" htmlFor="includesTravel">
                      Inclui deslocação às instalações do cliente
                    </label>
                  </div>
                </div>
              )}
              <div className="form-group mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="text-secondary fw-bold">Horários do Serviço</label>
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
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="text-secondary fw-bold">Cliente</label>
                <input
                  className="form-control"
                  list="clientOptions"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Pesquisar cliente..."
                  required
                  disabled={isPastOrCompleted}
                />
                <datalist id="clientOptions">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="text-secondary fw-bold">Equipamento</label>
                <select className="form-control" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required disabled={isPastOrCompleted || !clientId || isLoadingEquipments}>
                  <option value="">
                    {isLoadingEquipments ? 'A carregar equipamentos...' : 'Selecione um equipamento...'}
                  </option>
                  {equipments.map(eq => (
                    <option key={eq.id} value={String(eq.id)}>
                      {`${eq.brand || ''} ${eq.model || ''}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="text-secondary fw-bold">Técnico(s)</label>
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
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="mb-0 text-secondary fw-bold">Peças a Utilizar</label>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr className="align-middle">
                          <th style={{ width: '75px' }} className="small">Qt</th>
                          <th style={{ width: '160px' }} className="small">Referência</th>
                          <th className="small">Designação</th>
                          <th style={{ width: '80px' }} className="text-center small">Aplicada</th>
                          <th style={{ width: '120px' }} className="small">Origem</th>
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
                                placeholder="Qtd"
                                value={part.quantity}
                                onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                disabled={isPastOrCompleted}
                                min="1"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Referência"
                                value={part.reference}
                                onChange={e => handlePartChange(index, 'reference', e.target.value)}
                                onBlur={() => handleReferenceBlur(index)}
                                disabled={isPastOrCompleted}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Designação"
                                value={part.designation}
                                onChange={e => handlePartChange(index, 'designation', e.target.value)}
                                disabled={part.isDesignationLocked || isPastOrCompleted}
                              />
                            </td>
                            <td className="text-center align-middle">
                              <div className="d-flex justify-content-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0"
                                  checked={part.isApplied !== false}
                                  onChange={e => handlePartChange(index, 'isApplied', e.target.checked)}
                                  disabled={isPastOrCompleted}
                                />
                              </div>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={part.stockType || StockType.GENERAL}
                                onChange={e => handlePartChange(index, 'stockType', e.target.value)}
                                disabled={isPastOrCompleted}
                              >
                                <option value={StockType.GENERAL}>Geral</option>
                                <option value={StockType.CONTRACT}>Contrato</option>
                                <option value={StockType.CLIENT}>Cliente</option>
                                <option value={StockType.WARRANTY}>Garantia</option>
                              </select>
                            </td>
                            <td className="text-center align-middle">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRemovePart(index)}
                                disabled={isPastOrCompleted}
                                title="Remover Peça"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!isPastOrCompleted && (
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPart}>
                          Adicionar Peça
                        </button>
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
                    )}
                  </div>
                </div>
              )}

              {!isTicketScheduling && (
                <div className="form-group">
                  <label className="text-secondary fw-bold">Notas Internas</label>
                  <textarea
                    ref={internalNotesRef}
                    className="form-control"
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={1}
                    style={{ overflow: 'hidden', resize: 'none' }}
                    disabled={isPastOrCompleted}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer d-flex justify-content-between">
              <div>
                {!isCreating && (
                  <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isSubmitting}>
                    <Trash2 size={18} className="me-2" />
                    {isSubmitting ? 'A eliminar...' : 'Eliminar'}
                  </button>
                )}
              </div>
              <div>
                <button type="button" className="btn btn-secondary me-2" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                {!isPastOrCompleted && (
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {isCreating ? 'A criar...' : 'A guardar...'}
                      </>
                    ) : (isCreating ? 'Criar' : 'Guardar')}
                  </button>
                )}
                {canComplete && (
                  <button type="button" className="btn btn-success ms-2" onClick={handleComplete} disabled={isSubmitting}>
                    {isSubmitting ? 'A concluir...' : 'Concluir Serviço'}
                  </button>
                )}
                {isCompleted && (
                  <button type="button" className="btn btn-info ms-2" onClick={() => onManageReport(event!)} disabled={isSubmitting}>
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
