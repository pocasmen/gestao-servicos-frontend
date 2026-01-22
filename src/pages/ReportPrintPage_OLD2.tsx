import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, Wrench, Package, FileText, CheckCircle2 } from 'lucide-react';
import apiClient from '../apiClient';
import { PartItem } from '../types';
import './ReportPrintPage.css';

// Interface para os dados completos do relatório
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
  signature?: string;
  technician_signature?: string;
  timeBlocks?: { id: number; start: string; end: string }[];

}

const calculateHours = (start: Date, end: Date): number => {
  let diffMs = end.getTime() - start.getTime();
  let diffHours = diffMs / (1000 * 60 * 60);

  const lunchStart = new Date(start);
  lunchStart.setHours(13, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(14, 0, 0, 0);

  if (start < lunchEnd && end > lunchStart) {
    const overlapStart = Math.max(start.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(end.getTime(), lunchEnd.getTime());
    if (overlapEnd > overlapStart) {
      const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      diffHours -= overlapHours;
    }
  }

  return Math.max(0, Math.ceil(diffHours));
};

const ReportPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<DetailedReport | null>(null);

  useEffect(() => {
    if (id) {
      apiClient.get(`/report/${id}`)
        .then(res => setReport(res.data))
        .catch(err => console.error("Erro ao carregar o relatório:", err));
    }
  }, [id]);

  if (!report) {
    return <div className="loading-container">A carregar dados do relatório...</div>;
  }

  const serviceTypeLabels: { [key: string]: string } = {
    reparacao: 'Reparação',
    instalacao: 'Instalação',
    assistencia: 'Assistência',
    manutencao: 'Manutenção',
    remota: 'Remota'
  };

  const reportLines = report.description?.split('\n') || [];

  return (
    <div className="modern-report-container">
      <div className="modern-report-sheet">

        {/* Header Moderno com Gradiente */}
        <div className="modern-header">
          <div className="header-decoration header-decoration-top"></div>
          <div className="header-decoration header-decoration-bottom"></div>

          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <Wrench className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h1 className="header-title">Relatório de Serviço</h1>
                <p className="header-subtitle">Micro Átomo Tecnologia</p>
              </div>
            </div>
            <div className="header-right">
              <div className="report-number-box">
                <div className="report-number-label">Nº do Relatório</div>
                <div className="report-number-value">{report.report_number}</div>
              </div>
              <div className="report-date">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(report.serviceDate).toLocaleDateString('pt-PT')}
              </div>
            </div>
          </div>
        </div>

        {/* Tipo de Serviço */}
        <div className="service-type-section">
          <div className="service-type-badges">
            {Object.keys(serviceTypeLabels).map(type => (
              <div
                key={type}
                className={`service-badge ${report.serviceType?.includes(type) ? 'service-badge-active' : 'service-badge-inactive'}`}
              >
                {report.serviceType?.includes(type) && (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {serviceTypeLabels[type]}
              </div>
            ))}
          </div>
        </div>

        {/* Informação do Cliente e Equipamento */}
        <div className="info-grid">
          {/* Cliente */}
          <div className="info-card info-card-client">
            <div className="info-card-header">
              <User className="w-5 h-5 text-blue-600 mr-2" />
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
              <Package className="w-5 h-5 text-purple-600 mr-2" />
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
                <div className="info-value info-value-mono">{report.equipmentSerialNumber}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="main-content-grid">
          {/* Descrição do Serviço */}
          <div className="description-section">
            {/* Avaria */}
            {report.damage && (
              <div className="damage-card">
                <div className="damage-header">
                  <h3 className="section-title">
                    <FileText className="w-4 h-4 mr-2" />
                    Avaria Reportada
                  </h3>
                </div>
                <div className="damage-content">
                  <p>{report.damage}</p>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div className="service-description-card">
              <div className="service-description-header">
                <h3 className="section-title">
                  <FileText className="w-4 h-4 mr-2" />
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

          {/* Peças Utilizadas */}
          <div className="parts-card">
            <div className="parts-header">
              <h3 className="section-title">
                <Package className="w-4 h-4 mr-2" />
                Peças Utilizadas
              </h3>
            </div>
            <div className="parts-list">
              {report.parts && report.parts.length > 0 ? (
                report.parts.map((part, index) => (
                  <div key={index} className="part-item">
                    <div className="part-header-row">
                      <span className="part-reference">{part.reference}</span>
                      <span className="part-quantity">{part.quantity}x</span>
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
          </div>
        </div>

        {/* Horas de Trabalho */}
        <div className="hours-section">
          <div className="hours-card">
            <div className="hours-header">
              <h3 className="section-title">
                <Clock className="w-4 h-4 mr-2" />
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
                    <th>Pausas</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.timeBlocks && report.timeBlocks.length > 0 ? (
                    report.timeBlocks.map((block, idx) => {
                      const start = new Date(block.start);
                      const end = new Date(block.end);
                      const hours = calculateHours(start, end);
                      return (
                        <tr key={idx}>
                          <td>{start.toLocaleDateString('pt-PT')}</td>
                          <td>{start.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{end.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>1h</td>
                          <td className="hours-total">{hours}h</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td className="hours-total">{report.hours}h</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer com Assinaturas */}
        <div className="footer-section">
          <div className="signatures-container">
            <div className="signature-block">
              <div className="signature-label">Técnico Responsável</div>
              <div className="signature-line">
                {report.technician_signature ? (
                  <img src={report.technician_signature} alt="Assinatura Técnico" className="signature-image" />
                ) : (
                  <div className="signature-name">{report.technicianName}</div>
                )}
              </div>
            </div>
            <div className="signature-block">
              <div className="signature-label">Assinatura do Cliente</div>
              <div className="signature-line">
                {report.signature && <img src={report.signature} alt="Assinatura" className="signature-image" />}
              </div>
            </div>

          </div>

          <div className="total-hours-box">
            <div className="total-hours-label">Total de Horas</div>
            <div className="total-hours-value">{report.hours}h</div>
          </div>
        </div>

        {/* Print Button */}
        <div className="print-button-container">
          <button
            onClick={() => window.print()}
            className="print-button"
          >
            Imprimir Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPrintPage;