import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { ActiveClientContext } from '../contexts/ActiveClientContext';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { History, Building2, Search, Cpu, Pencil, Check, X } from 'lucide-react';
import { Equipment } from '../types';

const ClientEquipmentsPage: React.FC = () => {
    const { activeClient } = useContext(ActiveClientContext);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const { alert, confirm } = useConfirm();
    const navigate = useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [newNickname, setNewNickname] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!activeClient) {
            navigate('/portal');
            return;
        }

        const fetchEquipments = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get('/api/client-portal/my-equipments');
                setEquipments(res.data || []);
            } catch (error) {
                logger.error(error, "Failed to load client equipments:");
                alert("Não foi possível carregar o seu parque de equipamentos.");
            } finally {
                setLoading(false);
            }
        };

        fetchEquipments();
    }, [activeClient, navigate]);

    const filteredEquipments = equipments.filter(e =>
        e.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.nickname && e.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleOpenEditNickname = (equipment: Equipment) => {
        setSelectedEquipment(equipment);
        setNewNickname(equipment.nickname || '');
        setIsEditModalOpen(true);
    };

    const handleSaveNickname = async () => {
        if (!selectedEquipment) return;
        setIsSaving(true);
        try {
            await apiClient.put(`/api/client-portal/my-equipments/${selectedEquipment.id}/nickname`, { nickname: newNickname });
            setEquipments(prev => prev.map(e => e.id === selectedEquipment.id ? { ...e, nickname: newNickname } : e));
            setIsEditModalOpen(false);
            // Optional: alert('Alcunha atualizada com sucesso!', 'Sucesso');
        } catch (error) {
            logger.error(error, "Failed to update nickname:");
            alert("Erro ao atualizar a alcunha do equipamento.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeClient) return null;

    return (
        <div className="container-fluid py-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-3">
                        <Cpu size={40} strokeWidth={2.5} className="text-primary" />
                        <h1 className="display-5 fw-bold mb-0 text-primary" style={{ color: 'var(--primary-color)' }}>O Seu Parque de Equipamentos</h1>
                    </div>
                    <p className="text-muted lead">Consulte e gira os ativos associados à {activeClient.name}.</p>
                </div>
                <div className="position-relative" style={{ minWidth: '300px' }}>
                    <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                    <input
                        type="text"
                        className="form-control ps-5 rounded-pill shadow-sm"
                        placeholder="Pesquisar por marca, modelo ou nº série..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">A carregar...</span>
                    </div>
                </div>
            ) : filteredEquipments.length === 0 ? (
                <div className="text-center py-5 glass-panel rounded-4">
                    <Cpu size={48} className="text-muted mb-3 opacity-25" />
                    <p className="text-muted">Nenhum equipamento encontrado.</p>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredEquipments.map((equipment) => (
                        <div key={equipment.id} className="col-12 col-md-6 col-lg-4">
                            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden equipment-card transition-all">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start justify-content-between mb-3">
                                        <div className="bg-primary-bg-subtle p-3 rounded-3 text-primary">
                                            <Cpu size={24} />
                                        </div>
                                        <Link
                                            to="/portal/history"
                                            state={{ equipmentId: equipment.id }}
                                            className="btn btn-sm btn-outline-primary rounded-pill border-0 shadow-none"
                                            title="Ver Histórico de Intervenções"
                                        >
                                            <History size={18} className="me-1" /> Histórico
                                        </Link>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                        <h4 className="fw-bold mb-0">{equipment.brand}</h4>
                                        {equipment.nickname && (
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill small fw-bold px-3 py-1" style={{ fontSize: '0.8rem' }}>
                                                {equipment.nickname}
                                            </span>
                                        )}
                                    </div>
                                    <h5 className="text-secondary mb-3">{equipment.model}</h5>

                                    <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                                        <div className="d-flex flex-column gap-1">
                                            <div>
                                                <span className="text-muted small d-block">Nº de Série</span>
                                                <span className="fw-medium">{equipment.serialNumber}</span>
                                                {equipment.status === 'inactive' && (
                                                <span className="badge bg-secondary ms-2 small">Inativo</span>
                                                )}
                                            </div>
                                            <button 
                                                className="btn btn-link p-0 text-primary small text-decoration-none d-flex align-items-center gap-1 hover-opacity-75 transition-all"
                                                onClick={() => handleOpenEditNickname(equipment)}
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                <Pencil size={12} /> {equipment.nickname ? 'Alterar Alcunha' : 'Adicionar Alcunha'}
                                            </button>
                                        </div>
                                        {equipment.status !== 'inactive' ? (
                                          <Link
                                              to="/portal/tickets"
                                              state={{ equipmentId: equipment.id }}
                                              className="btn btn-primary btn-sm rounded-3 fw-bold shadow-sm px-3"
                                          >
                                              Novo Ticket
                                          </Link>
                                        ) : (
                                          <span className="text-muted small italic">Indisponível</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {isEditModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1060, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn rounded-4" style={{ width: '90%', maxWidth: '400px' }}>
                        <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
                            <h5 className="text-white fw-bold m-0" style={{ fontSize: '1.1rem' }}>Identificar Equipamento</h5>
                            <button type="button" className="btn-close btn-close-white opacity-75" onClick={() => setIsEditModalOpen(false)}></button>
                        </div>
                        <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                            <p className="small text-muted mb-4">
                                Defina um nome personalizado (alcunha) para facilitar a identificação deste equipamento.
                            </p>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>Alcunha / Tag</label>
                                <input
                                    type="text"
                                    className="form-control rounded-3 border-light shadow-sm py-2"
                                    placeholder="Ex: Sala 1, bacto-01, etc..."
                                    value={newNickname}
                                    onChange={(e) => setNewNickname(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="small text-muted mb-2">
                                <strong>Equipamento:</strong> {selectedEquipment?.brand} {selectedEquipment?.model}
                            </div>
                            <div className="small text-muted">
                                <strong>Nº Série:</strong> {selectedEquipment?.serialNumber}
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
                            <button className="btn btn-link text-muted text-decoration-none fw-medium" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={handleSaveNickname} disabled={isSaving}>
                                {isSaving ? <span className="spinner-border spinner-border-sm"></span> : <Check size={18} />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientEquipmentsPage;
