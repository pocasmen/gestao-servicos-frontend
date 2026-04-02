import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { ActiveClientContext, ClientCompany } from '../contexts/ActiveClientContext';
import { Briefcase, Building2, ChevronRight, Construction, Building, LayoutDashboard } from 'lucide-react';
import { logger } from '../utils/logger';

const ClientPortalDashboardPage: React.FC = () => {
    const [companies, setCompanies] = useState<ClientCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const { activeClient, setActiveClient } = useContext(ActiveClientContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await apiClient.get('/api/client-portal/my-companies');
                const data = response.data || [];
                setCompanies(data);

                if (data.length === 1 && !activeClient) {
                    setActiveClient(data[0]);
                    navigate('/portal/dashboard');
                }
            } catch (error) {
                logger.error({ error }, 'Failed to load companies');
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const handleSelectCompany = (company: ClientCompany) => {
        setActiveClient(company);
        navigate('/portal/dashboard');
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">A carregar...</span>
                </div>
            </div>
        );
    }

    if (companies.length === 0) {
        return (
            <div className="container-fluid mt-5">
                <div className="alert alert-info text-center py-5 shadow-sm rounded-4 border-0">
                    <Building size={48} className="text-secondary mb-3 opacity-50" />
                    <h4 className="fw-bold">Nenhuma empresa associada</h4>
                    <p className="text-muted">De momento não possui nenhuma empresa associada ao seu perfil.</p>
                </div>
            </div>
        );
    }

    // If there's only one company, we might want to auto-select it, but giving them the dashboard is fine too. Let's redirect if 1? No, let them see it.

    return (
        <div className="container-fluid py-5" style={{ background: 'linear-gradient(135deg, var(--bs-gray-100) 0%, #ffffff 100%)', minHeight: 'calc(100vh - 70px)' }}>
            <div className="text-center mb-5">
                <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
                    <LayoutDashboard size={48} strokeWidth={2.5} className="text-primary" />
                    <h1 className="display-5 fw-bold mb-0" style={{ color: 'var(--primary-color)', letterSpacing: '-1px' }}>Portal do Cliente</h1>
                </div>
                <p className="lead text-secondary">Bem-vindo. Selecione a empresa que pretende gerir.</p>
            </div>

            <div className="row justify-content-center g-4">
                {companies.map((company, index) => (
                    <div key={company.id} className="col-12 col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div
                            className="card h-100 border-0 shadow-sm rounded-4 company-card position-relative overflow-hidden"
                            style={{
                                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                cursor: 'pointer',
                                background: activeClient?.id === company.id ? 'var(--bs-primary)' : '#ffffff',
                                color: activeClient?.id === company.id ? '#ffffff' : 'inherit'
                            }}
                            onClick={() => handleSelectCompany(company)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-10px)';
                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
                            }}
                        >
                            <div
                                className="position-absolute top-0 start-0 w-100 h-100"
                                style={{
                                    background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                                    pointerEvents: 'none'
                                }}
                            />
                            <div className="card-body p-4 d-flex flex-column z-1">
                                <div className="d-flex align-items-center mb-4">
                                    <div
                                        className="icon-circle d-flex align-items-center justify-content-center rounded-circle me-3"
                                        style={{
                                            width: '60px',
                                            height: '60px',
                                            backgroundColor: activeClient?.id === company.id ? 'rgba(255,255,255,0.2)' : 'var(--bs-primary-bg-subtle, #e0f0ff)',
                                            color: activeClient?.id === company.id ? '#ffffff' : 'var(--bs-primary)'
                                        }}
                                    >
                                        <Building2 size={28} />
                                    </div>
                                    <div>
                                        <h4 className="fw-bold mb-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} title={company.name}>{company.name}</h4>
                                        <small className={activeClient?.id === company.id ? "text-light opacity-75" : "text-muted"}>
                                            NIF: {company.nif || 'N/A'}
                                        </small>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-top" style={{ borderColor: activeClient?.id === company.id ? 'rgba(255,255,255,0.2)' : 'var(--bs-border-color)' }}>
                                    <div className="d-flex justify-content-between align-items-center fw-medium">
                                        <span>Aceder à área de gestão</span>
                                        <ChevronRight size={20} className="animated-arrow" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClientPortalDashboardPage;
