import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Report } from '../types';

interface ClientViewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
}

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
              <strong>Peças Utilizadas:</strong>
              {renderParts(report.parts)}
            </div>
          </div>
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
