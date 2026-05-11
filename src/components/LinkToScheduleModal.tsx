import React, { useState, useEffect } from 'react';
import { Link2, Calendar, Search, X, Loader2 } from 'lucide-react';
import apiClient from '../apiClient';
import { Ticket, ScheduleEvent } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface LinkToScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSuccess: () => void;
}

const LinkToScheduleModal: React.FC<LinkToScheduleModalProps> = ({ isOpen, onClose, ticket, onSuccess }) => {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const { confirm, alert } = useConfirm();

  useEffect(() => {
    if (isOpen && ticket) {
      fetchAvailableSchedules();
    }
  }, [isOpen, ticket]);

  const fetchAvailableSchedules = async () => {
    if (!ticket) return;
    setLoading(true);
    try {
      // Procurar apenas AGENDAMENTOS (não tarefas) para o EQUIPAMENTO específico que não estejam concluídos
      const response = await apiClient.get(`/api/schedules?clientId=${ticket.client_id}&equipmentId=${ticket.equipmentId}&isTask=false&isCompleted=false&limit=500`);
      
      const allSchedules: ScheduleEvent[] = response.data?.data || response.data || [];
      
      if (import.meta.env.DEV) {
        console.log("[DEBUG LINK] Ticket:", { id: ticket.id, clientId: ticket.client_id, equipmentId: ticket.equipmentId });
        console.log("[DEBUG LINK] Schedules encontrados para o cliente:", allSchedules);
      }

      // Filtrar apenas agendamentos que ainda não têm um ticket associado (ou o próprio)
      const available = allSchedules.filter(s => !s.ticketId || s.ticketId === ticket.id);

      // Ordenar: Agendamentos com o mesmo equipamento primeiro
      const sorted = [...available].sort((a, b) => {
        const aMatch = a.equipmentId && Number(a.equipmentId) === Number(ticket.equipmentId);
        const bMatch = b.equipmentId && Number(b.equipmentId) === Number(ticket.equipmentId);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      setSchedules(sorted);
    } catch (error) {
      logger.error(error, "Erro ao procurar agendamentos disponíveis:");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (schedule: ScheduleEvent) => {
    if (!ticket) return;

    const scheduleId = schedule.scheduleId || (typeof schedule.id === 'number' ? schedule.id : null);
    if (!scheduleId) return;

    const confirmTitle = 'Confirmar Vínculo';
    const displayDate = schedule.startDate ? format(new Date(schedule.startDate), 'dd/MM/yyyy HH:mm') : 
                        (schedule.timeBlocks && schedule.timeBlocks.length > 0 ? format(new Date(schedule.timeBlocks[0].start), 'dd/MM/yyyy HH:mm') : 'data indefinida');
    const confirmMessage = `Tem a certeza que deseja vincular o Ticket #${ticket.id} ao agendamento de ${displayDate}?`;

    const isConfirmed = await confirm({
      message: confirmMessage,
      title: confirmTitle,
      confirmText: 'Vincular',
      variant: 'primary'
    });

    if (!isConfirmed) return;

    setLinking(true);
    try {
      await apiClient.put(`/api/tickets/${ticket.id}/link-schedule/${scheduleId}`);
      await alert('Ticket vinculado com sucesso!', 'Sucesso');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error(error, "Erro ao vincular ticket:");
      await alert('Não foi possível realizar o vínculo.');
    } finally {
      setLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ zIndex: 1040, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-card border-0 shadow-lg animate__animated animate__zoomIn w-100" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center rounded-top">
          <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
            <Link2 size={22} className="text-primary" />
            Vincular a Agendamento Existente
          </h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        {/* Body */}
        <div className="p-4 bg-white overflow-auto" style={{ flex: 1 }}>
          {ticket && (
            <div className="p-3 mb-4 rounded-4" style={{ backgroundColor: '#f8faff', border: '1px solid #e0e8f9' }}>
              <div className="small fw-bold text-uppercase text-primary opacity-75 mb-1" style={{ letterSpacing: '0.05em' }}>Ticket Selecionado</div>
              <div className="fw-bold text-dark fs-5 mb-1">#{ticket.id} - {ticket.title}</div>
              <div className="small text-muted d-flex gap-3">
                <span><strong>Cliente:</strong> {ticket.clientName}</span>
                <span><strong>Equipamento:</strong> {ticket.equipmentInfo || 'S/N não definido'}</span>
              </div>
            </div>
          )}

          <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Agendamentos Disponíveis
          </h6>

          {loading ? (
            <div className="text-center py-5">
              <Loader2 className="animate-spin text-primary mb-2" size={40} />
              <p className="text-muted fw-medium">A procurar agendamentos em aberto...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-5 bg-light rounded-4 border border-dashed border-2">
              <Search size={40} className="text-muted opacity-25 mb-3" />
              <p className="text-muted fw-medium m-0">Não foram encontrados agendamentos abertos para este equipamento.</p>
              <p className="small text-muted px-4">Verifique se o agendamento já foi criado no calendário ou se pertence a este cliente.</p>
            </div>
          ) : (
            <div className="table-responsive rounded-4 border overflow-hidden">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr className="small text-uppercase fw-bold text-muted">
                    <th className="ps-4 py-3">Data / Hora</th>
                    <th className="py-3">Técnico</th>
                    <th className="py-3">Tipo de Serviço</th>
                    <th className="text-end pe-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td className="ps-4 py-3">
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-dark">
                            {s.startDate ? format(new Date(s.startDate), 'dd/MM/yyyy', { locale: pt }) : 
                             (s.timeBlocks && s.timeBlocks.length > 0 ? format(new Date(s.timeBlocks[0].start), 'dd/MM/yyyy', { locale: pt }) : 'N/D')}
                          </span>
                          <small className="text-muted">
                            {s.startDate ? format(new Date(s.startDate), 'HH:mm', { locale: pt }) : 
                             (s.timeBlocks && s.timeBlocks.length > 0 ? format(new Date(s.timeBlocks[0].start), 'HH:mm', { locale: pt }) : '--:--')}
                          </small>
                        </div>
                        {s.equipmentId && Number(s.equipmentId) === Number(ticket?.equipmentId) && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle mt-1" style={{ fontSize: '0.7rem' }}>
                            Mesmo Equipamento
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {s.technicians && s.technicians.length > 0 ? (
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle shadow-sm" 
                              style={{ width: '10px', height: '10px', backgroundColor: s.technicians[0].color || '#ccc' }}
                            />
                            <span className="small fw-medium">{s.technicians[0].name}</span>
                          </div>
                        ) : (
                          <span className="text-muted small italic">Não atribuído</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="badge bg-light text-dark border fw-medium">
                          {s.title || 'Visita Técnica'}
                        </span>
                      </td>
                      <td className="text-end pe-4 py-3">
                        <button 
                          className="btn btn-primary btn-sm rounded-pill px-3 fw-bold shadow-sm"
                          onClick={() => handleLink(s)}
                          disabled={linking}
                        >
                          {linking ? <Loader2 size={14} className="animate-spin" /> : <><Link2 size={14} className="me-1" /> Vincular</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-light border-top d-flex justify-content-end rounded-bottom">
          <button className="btn btn-link text-muted text-decoration-none fw-bold" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkToScheduleModal;
