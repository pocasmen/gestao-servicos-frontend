import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { addHours, format, parseISO } from 'date-fns';
import { useConfirm, ConfirmOptions } from '../contexts/ConfirmContext';
import apiClient from '../apiClient';
import { AuthContext } from '../contexts/AuthContext';
import { Client, Equipment, ScheduleEvent, PartItem, Report, Technician, BillingStatus } from '../types';
import logger from '../utils/logger';
import { StockType, UserRole, ServiceClassification } from '../constants/enums';
import DeleteReportModal from './DeleteReportModal';
import { Printer, Trash2, X, Save } from 'lucide-react';

// Sub-components
import ReportServiceInfo from './Report/ReportServiceInfo';
import ReportTimeInfo from './Report/ReportTimeInfo';
import ReportClientEquipment from './Report/ReportClientEquipment';
import ReportTechnicians from './Report/ReportTechnicians';
import ReportPartsTable from './Report/ReportPartsTable';
import ReportDescriptions from './Report/ReportDescriptions';
import ReportSignaturesSection from './Report/ReportSignaturesSection';
import ReportPhotos from './ReportPhotos';


// Utils
import { calculateHours } from '../utils/dateCalculations';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleEvent | null;
  reportToEdit: Report | null;
  onReportSaved: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  schedule,
  reportToEdit,
  onReportSaved
}) => {
  const isEditing = reportToEdit !== null;
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [parts, setParts] = useState<any[]>((isEditing ? [] : (schedule?.parts || [])).map((p: any) => ({ ...p, isDesignationLocked: p.track_stock !== false })));
  const [damage, setDamage] = useState('');
  const [description, setDescription] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [signature, setSignature] = useState<string | undefined>(undefined);
  const [technicianSignatures, setTechnicianSignatures] = useState<Record<string, string>>({});
  const [technicianSignature, setTechnicianSignature] = useState<string | undefined>(undefined);
  const [includesTravel, setIncludesTravel] = useState(false);
  const [classification, setClassification] = useState<ServiceClassification>(ServiceClassification.GERAL);
  const [isBillingPending, setIsBillingPending] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState<{ start: Date; end: Date }[]>([]);
  const [clientSignerName, setClientSignerName] = useState('');
  const [clientUsers, setClientUsers] = useState<{ id: string; first_name: string; last_name: string; email?: string }[]>([]);

  const damageRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const internalNotesRef = useRef<HTMLTextAreaElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm, alert } = useConfirm();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    [damageRef, descriptionRef, internalNotesRef].forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  }, [damage, description, internalNotes, isOpen]);

  const { user: authUser } = useContext(AuthContext);
  const isAdmin = authUser?.user_metadata?.role === UserRole.ADMIN || authUser?.user_metadata?.role === UserRole.SUPER_ADMIN;

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientEquipments, setClientEquipments] = useState<Equipment[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);



  useEffect(() => {
    apiClient.get('/api/clients').then(res => setAllClients(res.data))
      .catch(() => alert("Erro ao carregar lista de clientes."));
    apiClient.get('/api/technicians').then(res => setAllTechnicians((res.data || []).filter((t: any) => t.role !== UserRole.OFFICE_STAFF)))
      .catch(() => alert("Erro ao carregar lista de técnicos."));
  }, []);

  useEffect(() => {
    if (isEditing && reportToEdit) {
      // Fetch details to ensure we have everything (especially timeBlocks if coming from fallback)
      apiClient.get(`/api/reports/${reportToEdit.id}`).then(res => {
        const fullReport = res.data;
        setClientId(fullReport.clientId);
        setEquipmentId(fullReport.equipmentId);
        setTechnicianIds(fullReport.technicians?.map((t: any) => t.id) || []);
        setServiceDate(format(parseISO(fullReport.serviceDate), "yyyy-MM-dd'T'HH:mm"));
        setHours(fullReport.hours);
        setDescription(fullReport.description);
        setDamage(fullReport.damage || '');
        setServiceTypes(fullReport.serviceType || []);
        setInternalNotes(fullReport.internalNotes || fullReport.internal_notes || '');
        setParts((fullReport.parts || []).map((p: any) => ({ ...p, isDesignationLocked: p.track_stock !== false })));
        setSignature(fullReport.signature);

        const sigs: Record<string, string> = {};
        if (fullReport.technicians) {
          fullReport.technicians.forEach((t: any) => {
            if (t.signature) sigs[t.id] = t.signature;
          });
        }
        setTechnicianSignatures(sigs);

        setTechnicianSignature(fullReport.technician_signature);
        setIncludesTravel(fullReport.includes_travel || false);
        setClassification(fullReport.classification || ServiceClassification.GERAL);
        setIsBillingPending(fullReport.billing_status === BillingStatus.PENDING_COMPLETION);
        setClientSignerName(fullReport.client_signer_name || '');

        const blocks = fullReport.timeBlocks || fullReport.time_blocks || [];
        if (blocks.length > 0) {
          setTimeBlocks(blocks.map((tb: any) => ({ 
            start: new Date(tb.start || tb.start_time), 
            end: new Date(tb.end || tb.end_time) 
          })));
        } else {
          setTimeBlocks([]);
        }
      }).catch(err => {
        logger.error(err, "Erro ao carregar detalhes do relatório:");
        // Fallback to what we already have in props if fetch fails
        setClientId(reportToEdit.clientId);
        setEquipmentId(reportToEdit.equipmentId);
        setTechnicianIds(reportToEdit.technicians?.map(t => t.id) || []);
        setServiceDate(format(parseISO(reportToEdit.serviceDate), "yyyy-MM-dd'T'HH:mm"));
        setHours(reportToEdit.hours);
        setDescription(reportToEdit.description);
        setDamage(reportToEdit.damage || '');
        setServiceTypes(reportToEdit.serviceType || []);
        setInternalNotes(reportToEdit.internalNotes || reportToEdit.internal_notes || '');
        setParts((reportToEdit.parts || []).map((p: any) => ({ ...p, isDesignationLocked: p.track_stock !== false })));
        setSignature(reportToEdit.signature);
        setTechnicianSignature(reportToEdit.technician_signature);
        setIncludesTravel(reportToEdit.includes_travel || false);
        setClassification(reportToEdit.classification || ServiceClassification.GERAL);
        setIsBillingPending(reportToEdit.billing_status === BillingStatus.PENDING_COMPLETION);
        setClientSignerName(reportToEdit.client_signer_name || '');
      });

    } else if (!isEditing && schedule) {
      setClientId(schedule.clientId);
      setEquipmentId(schedule.equipmentId);
      setTechnicianIds(schedule.technicians?.map(t => t.id) || []);

      let serviceStartDate: Date;
      let totalCalculatedHours = 0;

      const blocksFromSchedule = schedule.timeBlocks || (schedule as any).time_blocks || [];
      if (blocksFromSchedule.length > 0) {
        serviceStartDate = new Date(blocksFromSchedule[0].start || blocksFromSchedule[0].start_time);
        blocksFromSchedule.forEach((block: any) => {
          totalCalculatedHours += calculateHours(new Date(block.start || block.start_time), new Date(block.end || block.end_time));
        });
      } else if (schedule.start && schedule.end) {
        serviceStartDate = new Date(schedule.start);
        totalCalculatedHours = calculateHours(new Date(schedule.start), new Date(schedule.end));
      } else {
        serviceStartDate = new Date();
        totalCalculatedHours = 1;
      }

      if (isNaN(serviceStartDate.getTime())) {
        serviceStartDate = new Date();
      }

      setServiceDate(format(serviceStartDate, "yyyy-MM-dd'T'HH:mm"));
      setHours(totalCalculatedHours);
      if (blocksFromSchedule.length > 0) {
        setTimeBlocks(blocksFromSchedule.map((tb: any) => ({ 
          start: new Date(tb.start || tb.start_time), 
          end: new Date(tb.end || tb.end_time) 
        })));
      } else if (schedule.start && schedule.end) {
        setTimeBlocks([{ start: new Date(schedule.start), end: new Date(schedule.end) }]);
      } else {
        setTimeBlocks([]);
      }
      setParts((schedule.parts || []).map(p => ({ ...p, isDesignationLocked: !!p.designation })));
      setDescription('');
      setDamage('');
      setServiceTypes(schedule.serviceType ? (Array.isArray(schedule.serviceType) ? schedule.serviceType : [schedule.serviceType as string]) : []);
      setInternalNotes(schedule.internalNotes || schedule.internal_notes || '');
      setIncludesTravel(schedule.includes_travel || false);
      setClassification(schedule.classification || ServiceClassification.GERAL);
      setIsBillingPending(false);
      setSignature(undefined);
      setClientSignerName('');

      apiClient.get('/api/technicians').then(res => {
        const sigs: Record<string, string> = {};
        const techList = res.data || [];
        const initialTechIds = schedule.technicians?.map(t => t.id) || [];
        techList.forEach((p: any) => {
          if (initialTechIds.includes(p.id) && p.signature) {
            sigs[p.id] = p.signature;
          }
        });
        setTechnicianSignatures(sigs);
        if (authUser) {
          const myProfile = techList.find((p: any) => p.id === authUser.id);
          if (myProfile && myProfile.signature) {
            setTechnicianSignature(myProfile.signature);
          }
        }
      });
    }
  }, [schedule, reportToEdit, isEditing]);

  useEffect(() => {
    if (clientId) {
      apiClient.get(`/api/clients/${clientId}/equipments`).then(res => setClientEquipments(res.data));
    } else {
      setClientEquipments([]);
      setClientUsers([]);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      apiClient.get(`/api/clients/${clientId}/users`).then(res => setClientUsers(res.data))
        .catch(err => logger.error(err, "Erro ao carregar utilizadores do cliente:"));
    }
  }, [clientId]);

  if (!isOpen) return null;

  const handlePartChange = useCallback((index: number, fieldOrUpdates: keyof PartItem | Partial<PartItem>, value?: any) => {
    setParts(prev => {
      const newParts = [...prev];
      if (typeof fieldOrUpdates === 'string') {
        newParts[index] = { ...newParts[index], [fieldOrUpdates]: value };
        if (fieldOrUpdates === 'reference') {
          newParts[index].isDesignationLocked = false;
        }
      } else {
        newParts[index] = { ...newParts[index], ...fieldOrUpdates };
        // If reference is explicitly updated in the object, unlock designation
        if ('reference' in fieldOrUpdates) {
          newParts[index].isDesignationLocked = false;
        }
      }
      
      // Auto-add new row if last row is being filled
      if (index === newParts.length - 1 && (newParts[index].reference || newParts[index].designation)) {
        return [...newParts, { quantity: 1, reference: '', designation: '', isDesignationLocked: false }];
      }
      return newParts;
    });
  }, []);

  const handleReferenceBlur = useCallback(async (index: number) => {
    const part = parts[index];
    if (part.reference) {
      try {
        const response = await apiClient.get(`/api/inventory/parts/${part.reference}`);
        setParts(prev => {
          const newParts = [...prev];
          newParts[index] = {
            ...newParts[index],
            id: response.data.id,
            designation: response.data.designation,
            track_stock: response.data.track_stock,
            isDesignationLocked: response.data.track_stock !== false,
            stock_quantity: response.data.stock_quantity,
            reserved_quantity: response.data.reserved_quantity,
            stock_quantity_foss: response.data.stock_quantity_foss,
            reserved_quantity_foss: response.data.reserved_quantity_foss,
            image_path: response.data.image_path
          };
          return newParts;
        });
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          setParts(prev => {
            const newParts = [...prev];
            newParts[index] = { ...newParts[index], designation: '', isDesignationLocked: false };
            return newParts;
          });
        }
      }
    }
  }, [parts]);

  const handleTechnicianChange = (technicianId: string) => {
    setTechnicianIds(prevIds => {
      const exists = prevIds.includes(technicianId);
      const newIds = exists ? prevIds.filter(id => id !== technicianId) : [...prevIds, technicianId];
      if (!exists) {
        const tech = allTechnicians.find(t => t.id === technicianId);
        if (tech && (tech as any).signature) {
          setTechnicianSignatures(prev => ({ ...prev, [technicianId]: (tech as any).signature }));
        }
      }
      return newIds;
    });
  };

  const handleAddBlock = () => {
    const lastBlock = timeBlocks[timeBlocks.length - 1];
    let newStart = new Date();
    if (lastBlock && lastBlock.end) {
      newStart = new Date(lastBlock.end);
    }
    const newEnd = addHours(newStart, 1);
    const newBlocks = [...timeBlocks, { start: newStart, end: newEnd }];
    setTimeBlocks(newBlocks);
    
    // Sync serviceDate if it's the first block being added and date is empty
    if (newBlocks.length === 1 && !serviceDate) {
      setServiceDate(format(newStart, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handleRemoveBlock = (index: number) => {
    const newBlocks = timeBlocks.filter((_, i) => i !== index);
    setTimeBlocks(newBlocks);
    updateTotalHours(newBlocks);
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
    updateTotalHours(newBlocks);

    // Sync main serviceDate with the first block's start date
    if (index === 0 && field === 'start') {
      setServiceDate(format(value, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const updateTotalHours = (blocks: { start: Date; end: Date }[]) => {
    let total = 0;
    blocks.forEach(block => {
      total += calculateHours(block.start, block.end);
    });
    setHours(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!clientId) return alert('É obrigatório selecionar um cliente.');
    if (!equipmentId) return alert('É obrigatório selecionar um equipamento.');
    if (technicianIds.length === 0) return alert('É obrigatório selecionar pelo menos um técnico.');
    if (!serviceDate) return alert('É obrigatório definir a data do serviço.');
    if (!description || description.trim().length === 0) return alert('A descrição da intervenção é obrigatória.');
    if (serviceTypes.length === 0) return alert('É obrigatório selecionar pelo menos um tipo de serviço.');

    const partsToSubmit = parts.filter(p => p.reference || p.designation);
    const finalPartsToSubmit = [...partsToSubmit];
    for (let i = 0; i < finalPartsToSubmit.length; i++) {
      const part = finalPartsToSubmit[i];
      // Create part only if it doesn't have an ID and is not already a virtual item that exists (like TEX)
      if (part.reference && part.designation && !part.id && !part.isDesignationLocked) {
        try {
          const response = await apiClient.post('/api/inventory', { reference: part.reference, designation: part.designation });
          if (response.data && response.data.id) {
            finalPartsToSubmit[i] = { ...finalPartsToSubmit[i], id: response.data.id, isDesignationLocked: true };
          }
        } catch (error) {
          logger.error(error, "Erro ao criar nova peça:");
        }
      }
    }

    // Verificação de stock negativo (Aviso)
    const negativeStockParts = finalPartsToSubmit.filter(p => {
      if (p.track_stock === false) return false;
      if (p.stockType === StockType.CLIENT || p.stockType === StockType.WARRANTY) return false;
      const type = p.stockType || StockType.GENERAL;
      const currentQtyInReport = isEditing ? (reportToEdit?.parts?.find(op => Number(op.id) === Number(p.id))?.quantity || 0) : 0;
      const currentQtyInSchedule = !isEditing && schedule ? (schedule.parts?.find(sp => Number(sp.id) === Number(p.id))?.quantity || 0) : 0;

      const totalCompensated = currentQtyInReport + currentQtyInSchedule;

      if (type === StockType.FOSS) {
        const available = (p.stock_quantity_foss || 0) - (p.reserved_quantity_foss || 0) + totalCompensated;
        return available < p.quantity;
      } else if (type === StockType.GENERAL || type === StockType.CONTRACT || type === StockType.MSD) {
        const available = (p.stock_quantity || 0) - (p.reserved_quantity || 0) + totalCompensated;
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

    // Validação de stock baixo (Abaixo do mínimo)
    const lowStockParts = finalPartsToSubmit.filter(p => {
      if (p.track_stock === false) return false;
      if (p.stockType === StockType.CLIENT || p.stockType === StockType.WARRANTY) return false;
      const type = p.stockType || StockType.GENERAL;
      const currentQtyInReport = isEditing ? (reportToEdit?.parts?.find(op => Number(op.id) === Number(p.id))?.quantity || 0) : 0;
      const currentQtyInSchedule = !isEditing && schedule ? (schedule.parts?.find(sp => Number(sp.id) === Number(p.id))?.quantity || 0) : 0;

      const totalCompensated = currentQtyInReport + currentQtyInSchedule;

      if (type === StockType.FOSS) {
        const available = (p.stock_quantity_foss || 0) - (p.reserved_quantity_foss || 0) - p.quantity + totalCompensated;
        return available < (p.min_stock_foss || 0);
      } else if (type === StockType.GENERAL || type === StockType.CONTRACT || type === StockType.MSD) {
        const available = (p.stock_quantity || 0) - (p.reserved_quantity || 0) - p.quantity + totalCompensated;
        return available < (p.min_stock || 0);
      }
      return false;
    });

    const uniqueLowStockParts = lowStockParts.filter(lp => !negativeStockParts.some(np => np.id === lp.id));
    if (uniqueLowStockParts.length > 0) {
      const partNames = uniqueLowStockParts.map(p => p.designation || p.reference).join(', ');
      const proceed = await confirm({
        title: 'Aviso de Stock Baixo',
        message: `As seguintes peças ficarão abaixo do nível mínimo: ${partNames}. Deve providenciar nova encomenda. Deseja continuar?`,
        variant: 'warning',
        confirmText: 'Continuar',
        cancelText: 'Cancelar'
      } as ConfirmOptions);
      if (!proceed) return;
    }

    const reportData = {
      clientId: Number(clientId),
      equipmentId: Number(equipmentId),
      scheduleId: isEditing ? reportToEdit.scheduleId : (schedule?.scheduleId || (typeof schedule?.id === 'number' ? schedule.id : undefined)),
      technicianIds: technicianIds,
      serviceDate,
      hours: Number(hours),
      description,
      damage,
      serviceType: serviceTypes,
      internalNotes,
      signature,
      technician_signature: technicianSignature,
      technicianSignatures,
      includesTravel,
      classification,
      parts: finalPartsToSubmit
        .filter(p => p.id) // Ensure we only send parts with a valid ID to satisfy backend Zod validation
        .map(p => ({ ...p, isApplied: p.isApplied === false ? false : true })),
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      isBillingPending: isBillingPending,
      markAsReadyForBilling: !isBillingPending,
      client_signer_name: clientSignerName
    };

    const saveRequest = isEditing ? apiClient.put(`/api/reports/${reportToEdit.id}`, reportData) : apiClient.post('/api/reports', reportData);
    setIsSubmitting(true);
    saveRequest.then(() => { onReportSaved(); onClose(); })
      .catch(async (err: any) => { 
        const errorMsg = err.response?.data?.error;
        const details = err.response?.data?.details;
        
        if (details && Array.isArray(details)) {
          const detailMsgs = details.map((d: any) => d.message).join('\n');
          alert(`Erro de Validação:\n${detailMsgs}`);
        } else {
          alert(errorMsg || "Erro ao guardar relatório.");
        }
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = () => setShowDeleteConfirm(true);
  const confirmDelete = (restoreParts: boolean) => {
    if (!reportToEdit) return;
    apiClient.delete(`/api/reports/${reportToEdit.id}?restoreParts=${restoreParts}`).then(() => {
      setShowDeleteConfirm(false); onReportSaved(); onClose();
    }).catch(() => alert("Erro ao eliminar relatório."));
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden animate__animated animate__zoomIn w-100" style={{ maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>
              {isEditing ? 'Editar Relatório de Intervenção' : 'Criar Relatório de Intervenção'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <ReportServiceInfo
                serviceTypes={serviceTypes} setServiceTypes={setServiceTypes}
                classification={classification} setClassification={setClassification}
                includesTravel={includesTravel} setIncludesTravel={setIncludesTravel}
              />
              <ReportTimeInfo
                schedule={schedule}
                hours={hours}
                setHours={(val) => setHours(val)}
                timeBlocks={timeBlocks}
                handleBlockChange={handleBlockChange}
                handleAddBlock={handleAddBlock}
                handleRemoveBlock={handleRemoveBlock}
              />
              <ReportClientEquipment
                clientId={clientId} setClientId={(val) => setClientId(val)} allClients={allClients}
                equipmentId={equipmentId} setEquipmentId={(val) => setEquipmentId(val)} clientEquipments={clientEquipments}
              />
              <ReportTechnicians
                allTechnicians={allTechnicians} technicianIds={technicianIds}
                handleTechnicianChange={handleTechnicianChange}
              />
              <ReportPartsTable
                parts={parts} setParts={setParts}
                handlePartChange={handlePartChange} handleReferenceBlur={handleReferenceBlur}
              />
              <ReportDescriptions
                damage={damage} setDamage={setDamage} damageRef={damageRef}
                description={description} setDescription={setDescription} descriptionRef={descriptionRef}
                internalNotes={internalNotes} setInternalNotes={setInternalNotes} internalNotesRef={internalNotesRef}
              />
              <ReportPhotos reportId={reportToEdit?.id ?? null} />
              {/* Secção de Assinaturas */}
              <div className="mt-4">
                <h5 className="text-secondary border-bottom pb-2 mb-3">
                  <i className="bi bi-pencil-square me-2"></i>
                  Assinaturas
                </h5>
                
                <ReportSignaturesSection
                  signature={signature}
                  setSignature={setSignature}
                  clientSignerName={clientSignerName}
                  setClientSignerName={setClientSignerName}
                  clientUsers={clientUsers}
                />
              </div>
            </div>
          <div className="px-4 py-3 bg-light bg-opacity-50 border-top d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div className="d-flex flex-column align-items-start">
              {isEditing && reportToEdit && isAdmin && (
                <button type="button" className="btn btn-outline-danger border-0 rounded-pill px-3 fw-medium mb-2" onClick={handleDelete} disabled={isSubmitting}>
                  <Trash2 size={18} className="me-2" />
                  Eliminar
                </button>
              )}
              <div className="form-check form-switch ms-1 mb-0">
                <input className="form-check-input" type="checkbox" id="billingPendingCheck" checked={isBillingPending} onChange={(e) => setIsBillingPending(e.target.checked)} />
                <label className="form-check-label text-primary fw-bold small ms-1" htmlFor="billingPendingCheck">Pendente Faturação</label>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-end align-items-center mt-2 mt-sm-0">
              <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isSubmitting}>
                {isSubmitting ? <span className="spinner-border spinner-border-sm"></span> : <Save size={18} />}
                {isEditing ? 'Guardar' : 'Submeter'}
              </button>
              {isEditing && reportToEdit && (
                <button type="button" className="btn btn-info text-white rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={() => window.open(`/report/print/${reportToEdit.id}`, '_blank')}>
                  <Printer size={18} /> Ver PDF
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      {showDeleteConfirm && reportToEdit && (
        <DeleteReportModal report={reportToEdit} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} />
      )}
    </div>
  );
};

export default ReportModal;

