import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pt } from 'date-fns/locale';
import { addHours } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { registerLocale } from 'react-datepicker';
import apiClient, { searchPartByReference } from '../apiClient';
import { ScheduleEvent, Client, Equipment, Technician, PartItem } from '../types';
import logger from '../utils/logger';
import { StockType, UserRole, ServiceClassification, ScheduleStatus, SchedulePriority } from '../constants/enums';
import { Trash2, X, Save } from 'lucide-react';
import { useConfirm, ConfirmOptions } from '../contexts/ConfirmContext';
import { calculateHours } from '../utils/dateCalculations';

// Sub-components
import ScheduleFormHeader from './Schedule/ScheduleFormHeader';
import ScheduleTimeBlocks from './Schedule/ScheduleTimeBlocks';
import ScheduleClientEquipment from './Schedule/ScheduleClientEquipment';
import ScheduleTechnicians from './Schedule/ScheduleTechnicians';
import ScheduleParts from './Schedule/ScheduleParts';
import ScheduleInternalNotes from './Schedule/ScheduleInternalNotes';

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
  const [serviceType, setServiceType] = useState<string[]>([]);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [includesTravel, setIncludesTravel] = useState(false);
  const [classification, setClassification] = useState<ServiceClassification>(ServiceClassification.GERAL);
  const [sendToBacklog, setSendToBacklog] = useState(false);
  const [priority, setPriority] = useState<SchedulePriority>(SchedulePriority.MEDIUM);
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
    } else if (event?.start && event?.end) {
      setTimeBlocks([{ start: new Date(event.start), end: new Date(event.end) }]);
    } else {
      // If it's a backlog item being edited, but not yet dragged to a slot, 
      // we might want to default to today or keep it empty if we support that in UI.
      // For now, let's keep one block so the UI doesn't break.
      setTimeBlocks([{ start: new Date(), end: addHours(new Date(), 1) }]);
    }

    setClientId(event?.clientId !== undefined ? String(event.clientId) : '');
    setClientSearch(event?.clientName || '');
    setEquipmentId(event?.equipmentId !== undefined ? String(event.equipmentId) : '');
    setTechnicianIds(event?.technicians?.map(t => String(t.id)) || []);
    setIsCompleted(event?.isCompleted || false);
    setInternalNotes(event?.internalNotes || '');
    setServiceType(Array.isArray(event?.serviceType) ? event.serviceType : (event?.serviceType ? [event.serviceType] : (isTicketScheduling ? ['remota'] : [])));
    setIncludesTravel(event?.includes_travel || false);
    setClassification(event?.classification || ServiceClassification.GERAL);
    setPriority(event?.priority || SchedulePriority.MEDIUM);
    setSendToBacklog(event?.acknowledgementState === ScheduleStatus.PENDING_SCHEDULING && !event?.start);
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
      logger.debug({ clientId }, `[DEBUG] Fetching equipments for client`);
      apiClient.get(`/api/clients/${clientId}/equipments`)
        .then(res => {
          if (import.meta.env.DEV) {
            logger.debug(res.data, `[DEBUG] Equipments fetched:`);
          }
          setEquipments(res.data);
        })
        .catch(err => logger.error(err, "Error fetching equipments:"))
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
    let newStart = new Date();
    if (lastBlock && lastBlock.end) {
      newStart = new Date(lastBlock.end);
    }
    const newEnd = addHours(newStart, 1);
    setTimeBlocks([...timeBlocks, { start: newStart, end: newEnd }]);
  };

  const handleRemoveBlock = (index: number) => {
    if (timeBlocks.length <= 1) return;
    setTimeBlocks(timeBlocks.filter((_, i) => i !== index));
  };

  const handleBlockChange = (index: number, field: 'start' | 'end', value: Date | null) => {
    if (!value) return;
    const newBlocks = [...timeBlocks];
    const currentBlock = { ...newBlocks[index], [field]: value };

    // Rule: End date must not be before start date. If it is, set it to 1 hour after start.
    if (currentBlock.end < currentBlock.start) {
      currentBlock.end = addHours(currentBlock.start, 1);
    }

    newBlocks[index] = currentBlock;
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
      logger.debug({ index, reference }, '[DEBUG] handleReferenceBlur called');
    }

    if (typeof reference === 'string' && reference.trim() !== '') {
      try {
        if (import.meta.env.DEV) {
          logger.debug({ reference: reference.trim() }, '[DEBUG] Searching for part with reference');
        }
        const part = await searchPartByReference(reference.trim());
        if (import.meta.env.DEV) {
          logger.debug(part, '[DEBUG] Search result:');
        }

        const newParts = [...parts];
        if (part) {
          newParts[index].id = part.id;
          newParts[index].designation = part.designation;
          newParts[index].isDesignationLocked = true;
          newParts[index].stock_quantity = part.stock_quantity;
          newParts[index].reserved_quantity = part.reserved_quantity;
          newParts[index].stock_quantity_foss = part.stock_quantity_foss;
          newParts[index].reserved_quantity_foss = part.reserved_quantity_foss;
          if (import.meta.env.DEV) {
            logger.debug({ designation: part.designation }, '[DEBUG] Part found, updating designation to');
          }
        } else {
          newParts[index].id = undefined;
          newParts[index].designation = '';
          newParts[index].isDesignationLocked = false;
          if (import.meta.env.DEV) {
            logger.debug('[DEBUG] Part not found, clearing designation');
          }
        }
        setParts(newParts);
      } catch (error) {
        logger.error(error, '[ERROR] Error searching for part:');
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
          logger.warn(err, 'Clipboard API failed, using internal memory only.');
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
        logger.warn(err, 'Could not read from clipboard API:');
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
      logger.error(err, 'Erro ao colar:');
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

    if (serviceType.length === 0) {
      await alert('É obrigatório selecionar um tipo de serviço.');
      return;
    }

    if (timeBlocks.length === 0) {
      await alert('É obrigatório definir pelo menos um bloco de horário.');
      return;
    }

    const sTime = new Date(Math.min(...timeBlocks.map(b => b.start.getTime())));
    const eTime = new Date(Math.max(...timeBlocks.map(b => b.end.getTime())));

    if (!sendToBacklog && (isNaN(sTime.getTime()) || isNaN(eTime.getTime()))) {
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
      // currentQtyInSchedule is the quantity of this part already in the current schedule
      // This prevents false negatives when editing a schedule and reducing the quantity of a part.
      // If the part is new, currentQtyInSchedule will be 0.
      const currentQtyInSchedule = (event?.parts || []).find(ep => Number(ep.id) === Number(p.id))?.quantity || 0;

      if (type === StockType.FOSS) {
        const available = (p.stock_quantity_foss || 0) - (p.reserved_quantity_foss || 0) + currentQtyInSchedule;
        return available < p.quantity;
      } else if (type === StockType.GENERAL || type === StockType.CONTRACT || type === StockType.MSD) {
        const available = (p.stock_quantity || 0) - (p.reserved_quantity || 0) + currentQtyInSchedule;
        return available < p.quantity;
      }
      return false;
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
      startDate: sendToBacklog ? undefined : sTime.toISOString(),
      endDate: sendToBacklog ? undefined : eTime.toISOString(),
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      technicianIds,
      isCompleted,
      ticketId: event?.ticketId,
      internalNotes,
      serviceType,
      includesTravel,
      classification: classification,
      acknowledgementState: sendToBacklog ? ScheduleStatus.PENDING_SCHEDULING : (event?.acknowledgementState === ScheduleStatus.PENDING_SCHEDULING && !isCreating ? ScheduleStatus.PENDING : (event?.acknowledgementState || ScheduleStatus.PENDING)),
      timeBlocks: sendToBacklog ? [] : timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      priority: sendToBacklog ? priority : undefined,
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
      logger.debug(scheduleData, '[DEBUG_SCHEDULE_MODAL] handleSave - sending:');
    }

    // Determine correct ID for PUT
    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    setIsSubmitting(true);
    try {
      const response = isCreating
        ? await apiClient.post('/api/schedules', scheduleData)
        : await apiClient.put(`/api/schedules/${scheduleId}`, scheduleData);

      if (import.meta.env.DEV) {
        logger.debug(response.data, '[DEBUG_SCHEDULE_MODAL] handleSave - response:');
      }
      onScheduleUpdated(response.data);
      onClose();
    } catch (error) {
      logger.error(error, "Erro ao guardar agendamento:");
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

    if (serviceType.length === 0) {
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

    // Preparar as peças para envio, filtrando vazias
    const partsPayload = parts
      .filter(p => p.quantity > 0 && p.reference && p.reference.trim() !== '')
      .map(p => ({
        id: p.id,
        reference: p.reference,
        designation: p.designation,
        quantity: p.quantity,
        stockType: p.stockType || StockType.GENERAL,
        isApplied: p.isApplied === false ? false : true,
        // Incluir isDesignationLocked para o frontend (ReportModal), o backend irá ignorar
        isDesignationLocked: p.isDesignationLocked
      }));

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
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      parts: partsPayload // Incluir as peças na requisição de conclusão
    };

    if (import.meta.env.DEV) {
      logger.debug(scheduleData, '[DEBUG_SCHEDULE_MODAL] handleComplete - sending:');
    }

    const scheduleId = event?.scheduleId !== undefined ? event.scheduleId : (event?.id && typeof event.id === 'number' ? event.id : undefined);

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/api/schedules/${scheduleId}/complete`, scheduleData);
      if (import.meta.env.DEV) {
        logger.debug(response.data, '[DEBUG_SCHEDULE_MODAL] handleComplete - response:');
      }

      // Atualizar o calendário com o serviço fechado
      onScheduleUpdated(response.data);
      onClose();

      // Perguntar se pretende criar um relatório
      const createReport = await confirm({
        title: 'Serviço Fechado com Sucesso',
        message: 'O serviço foi fechado com sucesso. Pretende criar um relatório agora?',
        variant: 'primary',
        confirmText: 'Criar Relatório',
        cancelText: 'Mais Tarde'
      });

      if (createReport) {
        // Abrir automaticamente o modal de criação de relatório
        // Combinar response.data com timeBlocks do event original
        const scheduleForReport = {
          ...response.data,
          timeBlocks: timeBlocks.map(b => ({
            start: b.start.toISOString(),
            end: b.end.toISOString()
          })),
          // Preservar outros dados importantes do event original
          clientName: event.clientName,
          equipmentInfo: event.equipmentInfo,
          technicians: event.technicians,
          parts: partsPayload, // Passar as peças explicitamente para o relatório
          internalNotes: internalNotes // Passar as notas internas explicitamente
        };
        onManageReport(scheduleForReport);
      }
    } catch (error) {
      logger.error(error, "Erro ao concluir o serviço:");
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
          logger.error(error, "Erro ao eliminar agendamento:");
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
              <ScheduleFormHeader
                serviceType={serviceType}
                setServiceType={setServiceType}
                classification={classification}
                setClassification={setClassification}
                isCreating={isCreating}
                sendToBacklog={sendToBacklog}
                setSendToBacklog={setSendToBacklog}
                priority={priority}
                setPriority={setPriority}
                includesTravel={includesTravel}
                setIncludesTravel={setIncludesTravel}
                isPastOrCompleted={isPastOrCompleted}
              />

              <div className="row mb-0">
                <div className={sendToBacklog ? "col-12" : "col-md-9"}>
                  <ScheduleTimeBlocks
                    timeBlocks={timeBlocks}
                    handleBlockChange={handleBlockChange}
                    handleAddBlock={handleAddBlock}
                    handleRemoveBlock={handleRemoveBlock}
                    isPastOrCompleted={isPastOrCompleted}
                    sendToBacklog={sendToBacklog}
                  />
                </div>
                {!sendToBacklog && (
                  <div className="col-md-3 mb-2">
                    <div className="form-group p-2 border rounded bg-light h-100 d-flex flex-column justify-content-center align-items-center">
                      <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                        <i className="bi bi-hourglass-split me-2 text-primary"></i>
                        Horas Totais
                      </label>
                      <div className="h4 mb-0 text-primary fw-bold">
                        {timeBlocks.reduce((acc, block) => acc + calculateHours(block.start, block.end), 0)}h
                      </div>
                      <small className="text-muted mt-1 d-block italic text-center" style={{ fontSize: '0.6rem' }}>
                        Calculado auto.
                      </small>
                    </div>
                  </div>
                )}
              </div>

              <ScheduleClientEquipment
                clientSearch={clientSearch}
                setClientSearch={setClientSearch}
                clients={clients}
                equipmentId={equipmentId}
                setEquipmentId={setEquipmentId}
                equipments={equipments}
                isLoadingEquipments={isLoadingEquipments}
                clientId={clientId}
                isPastOrCompleted={isPastOrCompleted}
              />

              <ScheduleTechnicians
                technicians={technicians}
                technicianIds={technicianIds}
                handleTechnicianChange={handleTechnicianChange}
                isPastOrCompleted={isPastOrCompleted}
              />

              <ScheduleParts
                parts={parts}
                handlePartChange={handlePartChange}
                handleReferenceBlur={handleReferenceBlur}
                handleRemovePart={handleRemovePart}
                handleAddPart={handleAddPart}
                handleCopyParts={handleCopyParts}
                handlePasteParts={handlePasteParts}
                isPastOrCompleted={isPastOrCompleted}
                isTicketScheduling={isTicketScheduling}
              />

              <ScheduleInternalNotes
                internalNotes={internalNotes}
                setInternalNotes={setInternalNotes}
                isPastOrCompleted={isPastOrCompleted}
                isTicketScheduling={isTicketScheduling}
                internalNotesRef={internalNotesRef}
                isOpen={isOpen}
              />
            </div>
            <div className="modal-footer d-flex justify-content-between py-2">
              <div>
                {!isCreating && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete} disabled={isSubmitting}>
                    <Trash2 size={16} className="me-2" />
                    {isSubmitting ? 'A eliminar...' : 'Eliminar'}
                  </button>
                )}
              </div>
              <div className="d-flex gap-1 flex-wrap justify-content-end">
                <button type="button" className="btn btn-sm btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  <X size={16} className="me-1" /> Cancelar
                </button>
                {!isPastOrCompleted && (
                  <button type="submit" className="btn btn-sm btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        {isCreating ? 'A criar...' : 'A guardar...'}
                      </>
                    ) : (
                      <>
                        <Save size={16} className="me-1" />
                        {isCreating ? 'Criar' : 'Guardar'}
                      </>
                    )}
                  </button>
                )}
                {canComplete && (
                  <button type="button" className="btn btn-sm btn-success" onClick={handleComplete} disabled={isSubmitting}>
                    <i className="bi bi-check-circle me-1"></i>
                    {isSubmitting ? 'A concluir...' : 'Concluir'}
                  </button>
                )}
                {isCompleted && (
                  <button type="button" className="btn btn-sm btn-info" onClick={() => onManageReport(event!)} disabled={isSubmitting}>
                    <i className="bi bi-file-earmark-text me-1"></i>
                    {event?.hasReport ? 'Relatório' : 'Relatório'}
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
