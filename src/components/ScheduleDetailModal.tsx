import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { ScheduleEvent, Client, Equipment, Technician } from '../types'; // Importar tipos centralizados

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  onScheduleUpdated: () => void;
  onScheduleDeleted: () => void;
}

const formatDateTimeLocal = (date: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ScheduleDetailModal: React.FC<ModalProps> = ({ isOpen, onClose, event, onScheduleUpdated, onScheduleDeleted }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState<number | string>('');
  const [equipmentId, setEquipmentId] = useState<number | string>('');
  const [technicianId, setTechnicianId] = useState<number | string>('');

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientEquipments, setClientEquipments] = useState<Equipment[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);

  // Carregar dados estáticos (clientes, técnicos)
  useEffect(() => {
    apiClient.get('/clients').then(res => setAllClients(res.data));
    apiClient.get('/technicians').then(res => setAllTechnicians(res.data));
  }, []);

  // Preencher o formulário quando o evento muda
  useEffect(() => {
    if (event) {
      setTitle(String(event.title || '')); // Conversão explícita para string
      setStartDate(formatDateTimeLocal(new Date(event.start!)));
      setEndDate(formatDateTimeLocal(new Date(event.end!)));
      setClientId(event.clientId);
      setTechnicianId(event.technicianId);
      // Carregar equipamentos do cliente e depois definir o equipamento
      apiClient.get(`/equipments/client/${event.clientId}`).then(res => {
        setClientEquipments(res.data);
        setEquipmentId(event.equipmentId);
      });
    } else {
        setClientEquipments([]);
    }
  }, [event]);

  // Atualizar equipamentos quando o cliente muda no formulário
  useEffect(() => {
    if (clientId) {
      apiClient.get(`/equipments/client/${clientId}`).then(res => setClientEquipments(res.data));
    } else {
        setClientEquipments([]);
    }
  }, [clientId]);

  if (!isOpen || !event) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSchedule = { title, startDate, endDate, clientId, equipmentId, technicianId };
    console.log("A enviar pedido PUT para /schedules/" + event.id, updatedSchedule);
    apiClient.put(`/schedules/${event.id}`, updatedSchedule)
      .then(response => {
        console.log("Resposta do servidor:", response.data);
        onScheduleUpdated();
        onClose();
      })
      .catch(error => {
        console.error("Erro ao atualizar o agendamento:", error.response || error.message);
      });
  };

  const handleDelete = () => {
    if (window.confirm('Tem a certeza que deseja eliminar este agendamento?')) {
      apiClient.delete(`/schedules/${event.id}`)
        .then(() => {
          onScheduleDeleted();
          onClose();
        });
    }
  };

  return (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSave} id="edit-schedule-form">
            <div className="modal-header">
              <h5 className="modal-title">Editar Agendamento</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título do Serviço</label>
                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={clientId} onChange={e => setClientId(Number(e.target.value))} required>
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
                <label>Técnico Responsável</label>
                <select className="form-control" value={technicianId} onChange={e => setTechnicianId(Number(e.target.value))} required>
                  {allTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Início do Serviço</label>
                <input type="datetime-local" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Fim do Serviço</label>
                <input type="datetime-local" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-danger me-auto" onClick={handleDelete}>Eliminar Agendamento</button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;
