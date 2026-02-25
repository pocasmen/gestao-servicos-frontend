import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { ActiveClientContext } from '../contexts/ActiveClientContext';
import { useConfirm } from '../contexts/ConfirmContext';
import logger from '../utils/logger';
import { History, Building2, Search, Cpu } from 'lucide-react';
import { Equipment } from '../types';

const ClientEquipmentsPage: React.FC = () => {
    const { activeClient } = useContext(ActiveClientContext);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const { alert } = useConfirm();
    const navigate = useNavigate();

    useEffect(() => {
        if (!activeClient) {
            navigate('/portal');
            return;
        }

        const fetchEquipments = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get('/api/my-equipments');
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
        e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!activeClient) return null;

    return (
        <div className="container-fluid py-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="display-5 fw-bold mb-0 text-primary">O Seu Parque de Equipamentos</h1>
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

                                    <h4 className="fw-bold mb-1">{equipment.brand}</h4>
                                    <h5 className="text-secondary mb-3">{equipment.model}</h5>

                                    <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="text-muted small d-block">Nº de Série</span>
                                            <span className="fw-medium">{equipment.serialNumber}</span>
                                        </div>
                                        <Link
                                            to="/portal/tickets"
                                            state={{ equipmentId: equipment.id }}
                                            className="btn btn-primary btn-sm rounded-3 fw-bold"
                                        >
                                            Novo Ticket
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientEquipmentsPage;
