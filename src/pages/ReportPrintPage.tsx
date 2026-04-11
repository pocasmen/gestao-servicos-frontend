import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, Wrench, Package, FileText, CheckCircle2, FileDown, Monitor } from 'lucide-react';
import apiClient from '../apiClient';
import { PartItem } from '../types';
import logo from '../logo.png';
import './ReportPrintPage.css';
import { SERVICE_TYPE_LABELS, STOCK_TYPE_LABELS, SERVICE_CLASSIFICATION_LABELS } from '../constants';
import { StockType, ServiceClassification } from '../constants/enums';
import { logger } from '../utils/logger';
import { calculateHours } from '../utils/dateCalculations';
import { format, parseISO } from 'date-fns';


interface DetailedReport {
    id: number;
    serviceDate: string;
    serviceType: string[];
    description: string;
    parts: PartItem[];
    hours: number;
    clientName: string;
    clientAddress: string;
    clientNif: string;
    equipmentBrand: string;
    equipmentModel: string;
    equipmentSerialNumber: string;
    damage: string;
    technicianName: string;
    report_number: string;
    technicians?: { id: string; name: string; color?: string; signature?: string }[];
    signature?: string;
    technician_signature?: string;
    timeBlocks?: { id: number; start: string; end: string }[];
    time_blocks?: { id: number; start_time: string; end_time: string; start?: string; end?: string }[];
    includes_travel?: boolean;
    classification?: ServiceClassification;
    client_signer_name?: string;
}



const ReportPrintPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [report, setReport] = useState<DetailedReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            setError(null);
            apiClient.get(`/api/reports/${id}`)
                .then(res => setReport(res.data))
                .catch(err => {
                    logger.error(err, "Erro ao carregar o relatório:");
                    setError("O relatório solicitado não foi encontrado ou não existe.");
                });
        }
    }, [id]);

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !report) return;
        setIsGenerating(true);

        const element = reportRef.current;

        // Add a class for PDF-specific styling
        element.classList.add('pdf-rendering');

        const opt = {
            margin: [5, 2, 5, 2] as [number, number, number, number],
            filename: `Relatorio_${report.report_number}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                windowWidth: 1024, // Use a standard web width for better element calculation
                x: 0,
                y: 0
            },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
            pagebreak: { mode: ['avoid-all' as const, 'css' as const, 'legacy' as const] }
        };

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            logger.error(err, "Erro ao gerar PDF:");
            window.print();
        } finally {
            element.classList.remove('pdf-rendering');
            setIsGenerating(false);
        }
    };

    if (error) {
        return (
            <div className="modern-report-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="alert alert-danger text-center p-5" style={{ maxWidth: '600px', width: '100%', borderRadius: '1rem' }}>
                    <div className="mb-4 d-flex justify-content-center">
                        <FileText className="text-danger" style={{ width: '4rem', height: '4rem' }} />
                    </div>
                    <h2 className="h3 mb-3 text-danger fw-bold" style={{ borderBottom: 'none', display: 'block' }}>Relatório Não Encontrado</h2>
                    <p className="text-muted mb-4">{error}</p>
                    <button
                        className="btn btn-primary px-4 py-2 rounded-pill"
                        onClick={() => window.history.back()}
                    >
                        Voltar atrás
                    </button>
                </div>
            </div>
        );
    }

    if (!report) {
        return <div className="loading-container">A carregar dados do relatório...</div>;
    }

    const serviceTypeLabels = SERVICE_TYPE_LABELS;

    const reportLines = report.description?.split('\n') || [];
    const damageLines = report.damage?.split('\n') || [];

    return (
        <div className="modern-report-container">
            <div className="modern-report-sheet" ref={reportRef}>

                {/* Header */}
                <div className="modern-header">
                    <div className="header-decoration header-decoration-top"></div>
                    <div className="header-decoration header-decoration-bottom"></div>

                    <div className="header-content">
                        <div className="header-left">
                            <div className="header-icon">
                                <img src={logo} alt="Micro Átomo" className="header-logo" />
                            </div>
                            <div>
                                <h1 className="header-title">Relatório de Serviço</h1>
                                <p className="header-subtitle">Micro Átomo Tecnologia Unipessoal Lda</p>
                            </div>
                        </div>
                        <div className="header-right">
                            <div className="report-number-box">
                                <div className="report-number-label">Nº do Relatório</div>
                                <div className="report-number-value">{report.report_number}</div>
                            </div>
                            <div className="report-date">
                                <Calendar className="calendar-icon" />
                                {(() => {
                                    const blocks: any[] = (report as any).timeBlocks || (report as any).time_blocks || [];
                                    if (blocks.length > 0) {
                                        const startStr = blocks[0].start || blocks[0].start_time;
                                        if (startStr) return format(parseISO(startStr), 'dd/MM/yyyy');
                                    }
                                    return report.serviceDate ? format(parseISO(report.serviceDate), 'dd/MM/yyyy') : 'N/A';
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tipo de Serviço e Classificação */}
                <div className="service-type-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div className="service-type-badges">
                        {Object.keys(serviceTypeLabels).map(type => (
                            <div
                                key={type}
                                className={`service-badge ${report.serviceType?.includes(type) ? 'service-badge-active' : 'service-badge-inactive'}`}
                            >
                                {report.serviceType?.includes(type) && (
                                    <CheckCircle2 className="check-icon" />
                                )}
                                {serviceTypeLabels[type]}
                            </div>
                        ))}
                    </div>

                    {report.classification && report.classification !== ServiceClassification.GERAL && (
                        <div className="classification-badge-container" style={{ flexShrink: 0 }}>
                            <span className={`badge ${report.classification === ServiceClassification.CONTRATO ? 'bg-primary' : report.classification === ServiceClassification.GARANTIA ? 'bg-warning text-dark' : 'bg-info'}`} style={{ fontSize: '0.9rem', padding: '5px 12px', borderRadius: '20px' }}>
                                {SERVICE_CLASSIFICATION_LABELS[report.classification]}
                            </span>
                        </div>
                    )}
                </div>

                {/* Informação do Cliente e Equipamento */}
                <div className="info-grid">
                    {/* Cliente */}
                    <div className="info-card info-card-client">
                        <div className="info-card-header">
                            <User className="user-icon" />
                            <h3 className="info-card-title">Informação do Cliente</h3>
                        </div>
                        <div className="info-card-content">
                            <div className="info-field">
                                <div className="info-label">Cliente</div>
                                <div className="info-value">{report.clientName}</div>
                            </div>
                            <div className="info-field">
                                <div className="info-label">NIF</div>
                                <div className="info-value">{report.clientNif}</div>
                            </div>
                            <div className="info-field">
                                <div className="info-label">Morada</div>
                                <div className="info-value">{report.clientAddress}</div>
                            </div>
                        </div>
                    </div>

                    {/* Equipamento */}
                    <div className="info-card info-card-equipment">
                        <div className="info-card-header">
                            <Monitor className="monitor-icon" />
                            <h3 className="info-card-title">Equipamento</h3>
                        </div>
                        <div className="info-card-content">
                            <div className="info-field-row">
                                <div className="info-field">
                                    <div className="info-label">Marca</div>
                                    <div className="info-value">{report.equipmentBrand}</div>
                                </div>
                                <div className="info-field">
                                    <div className="info-label">Modelo</div>
                                    <div className="info-value">{report.equipmentModel}</div>
                                </div>
                            </div>
                            <div className="info-field">
                                <div className="info-label">Nº de Série</div>
                                <div className="info-value">{report.equipmentSerialNumber}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal - Descrição */}
                <div className="description-section-full">
                    {/* Avaria */}
                    {report.damage && (
                        <div className="damage-card">
                            <div className="damage-header">
                                <h3 className="section-title">
                                    <FileText className="file-icon" />
                                    Avaria Reportada
                                </h3>
                            </div>
                            <div className="damage-content">
                                {damageLines.map((line, index) => (
                                    <div key={index} className="description-line">
                                        <div className="damage-bullet"></div>
                                        <p>{line}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Descrição */}
                    <div className="service-description-card">
                        <div className="service-description-header">
                            <h3 className="section-title">
                                <FileText className="file-icon" />
                                Descrição do Serviço
                            </h3>
                        </div>
                        <div className="service-description-content">
                            {reportLines.map((line, index) => (
                                <div key={index} className="description-line">
                                    <div className="description-bullet"></div>
                                    <p>{line}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recursos Grid - Peças e Horas lado a lado */}
                <div className="resources-grid">
                    {/* Peças Utilizadas */}
                    <div className="parts-card">
                        <div className="parts-header">
                            <h3 className="section-title">
                                <Package className="package-icon-small" />
                                Peças Utilizadas
                            </h3>
                        </div>
                        <div className="parts-list">
                            {report.parts && report.parts.length > 0 ? (
                                report.parts.map((part, index) => (
                                    <div key={index} className="part-item">
                                        <div className="part-header-row">
                                            <span className="part-reference">{part.reference}</span>
                                            <div className="part-meta">
                                                <span className={`part-origin-badge origin-${part.stockType || 'general'}`}>
                                                    {STOCK_TYPE_LABELS[(part.stockType as StockType) || StockType.GENERAL]}
                                                </span>
                                                <span className={`part-status-badge ${part.isApplied !== false ? 'status-applied' : 'status-not-applied'}`}>
                                                    {part.isApplied !== false ? 'Aplicada' : 'Não Aplicada'}
                                                </span>
                                                <span className="part-quantity">{part.quantity}x</span>
                                            </div>
                                        </div>
                                        <div className="part-designation">{part.designation}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="parts-empty">
                                    Nenhuma peça utilizada
                                </div>
                            )}
                        </div>
                        {report.includes_travel && (
                            <div className="travel-included-badge">
                                <span className="travel-icon">🚗</span>
                                <span className="travel-text">Deslocação Incluída</span>
                            </div>
                        )}
                    </div>

                    {/* Horas de Trabalho */}
                    <div className="hours-card">
                        <div className="hours-header">
                            <h3 className="section-title">
                                <Clock className="clock-icon" />
                                Registo de Horas
                            </h3>
                        </div>
                        <div className="hours-table-wrapper">
                            <table className="hours-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Início</th>
                                        <th>Fim</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const blocks = report.timeBlocks || (report as any).time_blocks || [];
                                        if (blocks.length > 0) {
                                            return blocks.map((block: any, idx: number) => {
                                                const startStr = block.start || block.start_time;
                                                const endStr = block.end || block.end_time;
                                                const start = parseISO(startStr);
                                                const end = parseISO(endStr);
                                                const hours = calculateHours(start, end);
                                                return (
                                                    <tr key={idx}>
                                                        <td>{format(start, 'dd/MM/yyyy')}</td>
                                                        <td>{format(start, 'HH:mm')}</td>
                                                        <td>{format(end, 'HH:mm')}</td>
                                                        <td className="hours-total">{hours}h</td>
                                                    </tr>
                                                );
                                            });
                                        } else {
                                            return (
                                                <tr>
                                                    <td>{report.serviceDate ? format(parseISO(report.serviceDate), 'dd/MM/yyyy') : 'N/A'}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td className="hours-total">{report.hours}h</td>
                                                </tr>
                                            );
                                        }
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer com Assinaturas */}
                <div className="footer-section">
                    <div className="signatures-container">
                        <div className="signature-block">
                            <div className="signature-label">Técnicos Responsáveis</div>
                            <div className="signature-line">
                                {report.technicians && report.technicians.length > 0 ? (
                                    report.technicians.map((tech: any, idx: number) => (
                                        <div key={idx} className="signature-item">
                                            <div className="signature-area">
                                                {tech.signature ? (
                                                    <img src={tech.signature} alt={`Assinatura ${tech.name}`} className="signature-image" />
                                                ) : (
                                                    <div className="signature-placeholder"></div>
                                                )}
                                            </div>
                                            <div className="signature-name">{tech.name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="signature-item">
                                        <div className="signature-area">
                                            {report.technician_signature ? (
                                                <img src={report.technician_signature} alt="Assinatura Técnico" className="signature-image" />
                                            ) : (
                                                <div className="signature-placeholder"></div>
                                            )}
                                        </div>
                                        <div className="signature-name">{report.technicianName}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="signature-block">
                            <div className="signature-label">Assinatura do Cliente</div>
                            <div className="signature-line">
                                <div className="signature-item">
                                    <div className="signature-area">
                                        {report.signature ? (
                                            <img src={report.signature} alt="Assinatura Cliente" className="signature-image" />
                                        ) : (
                                            <div className="signature-placeholder" style={{ opacity: 0 }}></div>
                                        )}
                                    </div>
                                    <div className="signature-name">{report.client_signer_name || report.clientName}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="total-hours-box">
                        <div className="total-hours-label">Total de Horas</div>
                        <div className="total-hours-value">{report.hours}h</div>
                    </div>
                </div>

                {/* Company Info Footer */}
                <div className="company-info-footer">
                    <div className="company-info-content">
                        <div className="company-name-legal">Micro Átomo – Tecnologia Electrónica, Unipessoal, Lda</div>
                        <div className="company-details-text">NIF 504 198 882</div>
                        <div className="company-details-text">Rua das Salemas, 6 | 2630-361 Arruda dos Vinhos</div>
                        <div className="company-details-text">
                            Tel: +351 263 976 016 | geral@microatomo.pt | www.microatomo.pt
                        </div>
                    </div>
                </div>
            </div>


            {/* Print Button - Keep outside de reportRef to avoid being in the PDF */}
            <div className="print-button-container">
                <button
                    onClick={handleDownloadPDF}
                    className="print-button"
                    disabled={isGenerating}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {isGenerating ? (
                        <>A gerar PDF...</>
                    ) : (
                        <>
                            <FileDown size={20} />
                            Guardar como PDF
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ReportPrintPage;