import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../apiClient'; // Usar o apiClient
import './ReportPrintPage.css'; // CSS para o layout

// Interface para os dados completos do relatório
interface DetailedReport {
  id: number;
  serviceDate: string;
  serviceType: string;
  description: string;
  parts: string;
  hours: number;
  clientName: string;
  clientAddress: string;
  clientNif: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerialNumber: string;
}

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
    return <div>A carregar dados do relatório...</div>;
  }

  // Simplesmente para o exemplo, vamos dividir o relatório em linhas
  const reportLines = report.description?.split('\n') || [];

  return (
    <div className="print-container">
      <div className="print-sheet">
        {/* Cabeçalho */}
        <header className="report-header">
          <div className="logo-area">
            {/* O logo será adicionado via CSS */}
          </div>
          <div className="title-area">
            <h1>SERVIÇO TÉCNICO</h1>
          </div>
        </header>

        {/* Informações Gerais */}
        <section className="info-section">
          <div className="report-id-date">
            <div className="field-box report-id">Nº {report.id}</div>
            <div className="field-box report-date">Data: {new Date(report.serviceDate).toLocaleDateString('pt-PT')}</div>
          </div>
          <div className="service-type">
            <span>Reparação <input type="checkbox" checked={report.serviceType === 'reparacao'} readOnly /></span>
            <span>Instalação <input type="checkbox" checked={report.serviceType === 'instalacao'} readOnly /></span>
            <span>Assistência <input type="checkbox" checked={report.serviceType === 'assistencia'} readOnly /></span>
            <span>Manutenção <input type="checkbox" checked={report.serviceType === 'manutencao'} readOnly /></span>
          </div>
        </section>

        {/* Detalhes do Cliente */}
        <section className="details-section client-details">
          <div className="field-group"><label>Cliente:</label><span>{report.clientName}</span></div>
          <div className="field-group"><label>N.º Contribuinte:</label><span>{report.clientNif}</span></div>
          <div className="field-group"><label>Morada:</label><span>{report.clientAddress}</span></div>
        </section>

        {/* Detalhes do Equipamento */}
        <section className="details-section equipment-details">
          <div className="field-group"><label>Equipamento:</label><span>{report.equipmentBrand}</span></div>
          <div className="field-group"><label>N.º de Série:</label><span>{report.equipmentSerialNumber}</span></div>
          <div className="field-group"><label>Marca:</label><span>{report.equipmentBrand}</span></div>
          <div className="field-group"><label>Modelo:</label><span>{report.equipmentModel}</span></div>
        </section>

        {/* Corpo do Relatório */}
        <main className="report-body">
          <div className="report-main-content">
            <div className="report-title">RELATÓRIO:</div>
            <div className="report-text-area">
              {reportLines.map((line, index) => (
                <div key={index} className="report-line">{line}</div>
              ))}
            </div>
          </div>
          <div className="report-side-content">
            <div className="parts-table">
                <div className="table-header">
                    <div className="col-qt">QT.</div>
                    <div className="col-desc">DESCRIÇÃO</div>
                    <div className="col-val">VALOR</div>
                </div>
                <div className="table-body">
                    <div className="table-row">
                        <div className="col-qt"></div>
                        <div className="col-desc">{report.parts}</div>
                        <div className="col-val"></div>
                    </div>
                     {/* Linhas vazias para preenchimento */}
                    {[...Array(10)].map((_, i) => <div key={i} className="table-row empty-row"><div className="col-qt"></div><div className="col-desc"></div><div className="col-val"></div></div>)}
                </div>
            </div>
          </div>
        </main>

        {/* Rodapé */}
        <footer className="report-footer">
            <div className="services-summary">
                 <div className="table-header">
                    <div>DATA</div><div>H/Início</div><div>H/Fim</div><div>Pausas</div><div>TOTAL</div>
                </div>
                 <div className="table-body">
                    <div className="table-row">
                        <div>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</div><div></div><div></div><div></div><div>{report.hours}</div>
                    </div>
                </div>
            </div>
            <div className="signatures">
                <div className="field-box signature-box">O Técnico</div>
                <div className="field-box signature-box">O Cliente</div>
            </div>
             <div className="total-summary">
                <div className="total-label">TOTAL:</div>
                <div className="total-value"></div>
            </div>
        </footer>

      </div>
    </div>
  );
};

export default ReportPrintPage;