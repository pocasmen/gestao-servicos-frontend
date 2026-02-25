import React, { useState, useEffect, useContext, useRef } from 'react';
import { useConfirm, ConfirmOptions } from '../contexts/ConfirmContext';
import apiClient from '../apiClient';
import { AuthContext } from '../contexts/AuthContext';
import { Client, Equipment, ScheduleEvent, PartItem, Report, Technician, BillingStatus } from '../types';
import logger from '../utils/logger';
import { StockType, UserRole, ServiceClassification } from '../constants/enums';
import DeleteReportModal from './DeleteReportModal';
import { Printer, Trash2 } from 'lucide-react';

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
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [parts, setParts] = useState<PartItem[]>([{ quantity: 1, reference: '', designation: '', isDesignationLocked: false }]);
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

  const isEditing = reportToEdit !== null;

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
        setServiceDate(new Date(fullReport.serviceDate).toISOString().slice(0, 16));
        setHours(fullReport.hours);
        setDescription(fullReport.description);
        setDamage(fullReport.damage || '');
        setServiceTypes(fullReport.serviceType || []);
        setInternalNotes(fullReport.internalNotes || '');
        setParts(fullReport.parts && fullReport.parts.length > 0 ? fullReport.parts : []);
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

        if (fullReport.timeBlocks && fullReport.timeBlocks.length > 0) {
          setTimeBlocks(fullReport.timeBlocks.map((tb: any) => ({ start: new Date(tb.start), end: new Date(tb.end) })));
        } else {
          setTimeBlocks([]);
        }
      }).catch(err => {
        logger.error(err, "Erro ao carregar detalhes do relatório:");
        // Fallback to what we already have in props if fetch fails
        setClientId(reportToEdit.clientId);
        setEquipmentId(reportToEdit.equipmentId);
        setTechnicianIds(reportToEdit.technicians?.map(t => t.id) || []);
        setServiceDate(new Date(reportToEdit.serviceDate).toISOString().slice(0, 16));
        setHours(reportToEdit.hours);
        setDescription(reportToEdit.description);
        setDamage(reportToEdit.damage || '');
        setServiceTypes(reportToEdit.serviceType || []);
        setInternalNotes(reportToEdit.internalNotes || '');
        setParts(reportToEdit.parts && reportToEdit.parts.length > 0 ? reportToEdit.parts : []);
        setSignature(reportToEdit.signature);
        setTechnicianSignature(reportToEdit.technician_signature);
        setIncludesTravel(reportToEdit.includes_travel || false);
        setClassification(reportToEdit.classification || ServiceClassification.GERAL);
        setIsBillingPending(reportToEdit.billing_status === BillingStatus.PENDING_COMPLETION);
      });

    } else if (!isEditing && schedule) {
      setClientId(schedule.clientId);
      setEquipmentId(schedule.equipmentId);
      setTechnicianIds(schedule.technicians?.map(t => t.id) || []);

      let serviceStartDate: Date;
      let totalCalculatedHours = 0;

      if (schedule.timeBlocks && schedule.timeBlocks.length > 0) {
        serviceStartDate = new Date(schedule.timeBlocks[0].start);
        schedule.timeBlocks.forEach(block => {
          totalCalculatedHours += calculateHours(new Date(block.start), new Date(block.end));
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

      setServiceDate(serviceStartDate.toISOString().slice(0, 16));
      setHours(totalCalculatedHours);
      if (schedule.timeBlocks && schedule.timeBlocks.length > 0) {
        setTimeBlocks(schedule.timeBlocks.map(tb => ({ start: new Date(tb.start), end: new Date(tb.end) })));
      } else if (schedule.start && schedule.end) {
        setTimeBlocks([{ start: new Date(schedule.start), end: new Date(schedule.end) }]);
      } else {
        setTimeBlocks([]);
      }
      setParts((schedule.parts || []).map(p => ({ ...p, isDesignationLocked: !!p.designation })));
      setDescription('');
      setDamage('');
      setServiceTypes(schedule.serviceType ? [schedule.serviceType] : []);
      setInternalNotes(schedule.internalNotes || '');
      setIncludesTravel(schedule.includes_travel || false);
      setClassification(schedule.classification || ServiceClassification.GERAL);
      setIsBillingPending(false);
      setSignature(undefined);

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
        newParts[index] = {
          ...newParts[index],
          id: response.data.id,
          designation: response.data.designation,
          isDesignationLocked: true,
          stock_quantity: response.data.stock_quantity,
          reserved_quantity: response.data.reserved_quantity,
          stock_quantity_contract: response.data.stock_quantity_contract,
          reserved_quantity_contract: response.data.reserved_quantity_contract
        };
        setParts(newParts);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          const newParts = [...parts];
          newParts[index] = { ...newParts[index], designation: '', isDesignationLocked: false };
          setParts(newParts);
        }
      }
    }
  };

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
    setTimeBlocks([...timeBlocks, { start: new Date(), end: new Date() }]);
  };

  const handleRemoveBlock = (index: number) => {
    const newBlocks = timeBlocks.filter((_, i) => i !== index);
    setTimeBlocks(newBlocks);
    updateTotalHours(newBlocks);
  };

  const handleBlockChange = (index: number, field: 'start' | 'end', value: Date | null) => {
    if (!value) return;
    const newBlocks = [...timeBlocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setTimeBlocks(newBlocks);
    updateTotalHours(newBlocks);
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
    if (serviceTypes.length === 0) return alert('É obrigatório selecionar pelo menos um tipo de serviço.');

    const partsToSubmit = parts.filter(p => p.reference || p.designation);
    const finalPartsToSubmit = [...partsToSubmit];
    for (let i = 0; i < finalPartsToSubmit.length; i++) {
      const part = finalPartsToSubmit[i];
      if (part.reference && part.designation && !part.isDesignationLocked) {
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
      if (p.stockType === StockType.CLIENT || p.stockType === StockType.WARRANTY) return false;
      const type = p.stockType || StockType.GENERAL;
      const currentQtyInReport = isEditing ? (reportToEdit?.parts?.find(op => op.id === p.id)?.quantity || 0) : 0;
      if (type === StockType.GENERAL) {
        const available = (p.stock_quantity || 0) - (p.reserved_quantity || 0) + currentQtyInReport;
        return available < p.quantity;
      } else {
        const available = (p.stock_quantity_contract || 0) - (p.reserved_quantity_contract || 0) + currentQtyInReport;
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
      parts: finalPartsToSubmit.map(p => ({ ...p, isApplied: p.isApplied === false ? false : true })),
      timeBlocks: timeBlocks.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      isBillingPending: isBillingPending,
      markAsReadyForBilling: !isBillingPending
    };

    const saveRequest = isEditing ? apiClient.put(`/api/reports/${reportToEdit.id}`, reportData) : apiClient.post('/api/reports', reportData);
    setIsSubmitting(true);
    saveRequest.then(() => { onReportSaved(); onClose(); })
      .catch(async (err: any) => { alert(err.response?.data?.error || "Erro ao guardar relatório."); })
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
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{isEditing ? 'Editar Relatório de Intervenção' : 'Criar Relatório de Intervenção'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
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
              <ReportSignaturesSection signature={signature} setSignature={setSignature} />
            </div>
            <div className="modal-footer d-flex justify-content-between">
              <div className="form-check form-switch ms-2">
                <input className="form-check-input" type="checkbox" id="billingPendingCheck" checked={isBillingPending} onChange={(e) => setIsBillingPending(e.target.checked)} />
                <label className="form-check-label text-warning fw-bold" htmlFor="billingPendingCheck">Ainda não pronto para faturação</label>
              </div>
              <div className="d-flex">
                {isEditing && reportToEdit && (
                  <button type="button" className="btn btn-outline-primary me-2" onClick={() => window.open(`/report/print/${reportToEdit.id}`, '_blank')}>
                    <Printer size={18} className="me-2" />Relatório
                  </button>
                )}
                {isEditing && reportToEdit && isAdmin && (
                  <button type="button" className="btn btn-outline-danger me-2" onClick={handleDelete} title="Eliminar Relatório"><Trash2 size={18} /></button>
                )}
                <button type="button" className="btn btn-secondary me-2" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...</> : (isEditing ? 'Guardar Alterações' : 'Criar Relatório')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showDeleteConfirm && reportToEdit && (
        <DeleteReportModal report={reportToEdit} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} />
      )}
    </div>
  );
};

export default ReportModal;

