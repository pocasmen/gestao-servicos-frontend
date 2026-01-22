import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Report } from '../types';

interface ClientViewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
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

const ClientViewReportModal: React.FC<ClientViewReportModalProps> = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  const renderServiceType = (serviceType: any) => {
    try {
      const types = Array.isArray(serviceType) ? serviceType : JSON.parse(serviceType);
      return Array.isArray(types) ? types.join(', ') : 'Não especificado';
    } catch {
      return 'Não especificado';
    }
  };

  const renderParts = (parts: any) => {
    try {
      const partList = Array.isArray(parts) ? parts : JSON.parse(parts);
      if (!Array.isArray(partList) || partList.length === 0) return <p>Nenhuma peça utilizada.</p>;
      return (
        <ul className="list-group">
          {partList.map((part, index) => (
            <li key={index} className="list-group-item">
              {part.quantity}x - {part.reference} - {part.designation}
            </li>
          ))}
        </ul>
      );
    } catch {
      return <p>Nenhuma peça utilizada.</p>;
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Relatório de Serviço #{report.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container-fluid">
          <div className="row mb-3">
            <div className="col-md-6">
              <strong>Cliente:</strong>
              <p>{report.clientName}</p>
            </div>
            <div className="col-md-6">
              <strong>Data do Serviço:</strong>
              <p>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</p>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-12">
              <strong>Equipamento:</strong>
              <p>{report.equipmentBrand} {report.equipmentModel} (NS: {report.equipmentSerialNumber})</p>
            </div>
          </div>
          <hr />
          <div className="row mb-3">
            <div className="col-md-6">
              <strong>Técnico(s):</strong>
              <p>{report.technicians?.map(t => t.name).join(', ') || 'N/A'}</p>
            </div>
            <div className="col-md-6">
              <strong>Tipo de Serviço:</strong>
              <p>{renderServiceType(report.serviceType)}</p>
            </div>
          </div>
          {report.damage && (
            <div className="row mb-3">
              <div className="col-md-12">
                <strong>Avaria Reportada:</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{report.damage}</p>
              </div>
            </div>
          )}
          <div className="row mb-3">
            <div className="col-md-12">
              <strong>Descrição do Serviço:</strong>
              <p style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
            </div>
          </div>
          <hr />
          <div className="row mb-3">
            <div className="col-md-12">
              <strong>Resumo de Horas:</strong>
              <div className="table-responsive">
                <table className="table table-sm table-bordered mt-2">
                  <thead className="table-light">
                    <tr>
                      <th>Data</th>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.timeBlocks && report.timeBlocks.length > 0 ? (
                      report.timeBlocks.map((block, idx) => {
                        const start = new Date(block.start);
                        const end = new Date(block.end);
                        const duration = calculateHours(start, end);
                        return (
                          <tr key={idx}>
                            <td>{start.toLocaleDateString('pt-PT')}</td>
                            <td>{start.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{end.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{duration} h</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td>{new Date(report.serviceDate).toLocaleDateString('pt-PT')}</td>
                        <td colSpan={2} className="text-center">-</td>
                        <td>{report.hours} h</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <th colSpan={3} className="text-end">TOTAL:</th>
                      <th>{report.hours} h</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <hr />
          <div className="row mb-3">
            <div className="col-md-12">
              <strong>Peças Utilizadas:</strong>
              {renderParts(report.parts)}
            </div>
          </div>
          {report.signature && (
            <>
              <hr />
              <div className="row mb-3">
                <div className="col-md-12">
                  <strong>Assinatura do Cliente:</strong>
                  <div className="mt-2 text-center" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '10px' }}>
                    <img src={report.signature} alt="Assinatura" style={{ maxWidth: '300px', maxHeight: '150px' }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ClientViewReportModal;
