import React, { useState } from 'react';
import { Report } from '../types';

interface DeleteReportModalProps {
    report: Report;
    onConfirm: (restoreParts: boolean) => void;
    onClose: () => void;
}

const DeleteReportModal: React.FC<DeleteReportModalProps> = ({ report, onConfirm, onClose }) => {
    const [restoreParts, setRestoreParts] = useState(true);

    return (
        <div className="modal show shadow" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">Eliminar Relatório {report.report_number}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <p className="mb-3">Tem a certeza que deseja eliminar este relatório? Esta ação não pode ser revertida.</p>
                        <div className="form-check p-3 border rounded bg-light">
                            <input
                                className="form-check-input ms-0 me-3"
                                type="checkbox"
                                id="restorePartsCheckModal"
                                checked={restoreParts}
                                onChange={(e) => setRestoreParts(e.target.checked)}
                                style={{ width: '1.2rem', height: '1.2rem' }}
                            />
                            <label className="form-check-label fw-bold" htmlFor="restorePartsCheckModal">
                                Repor peças usadas neste relatório no inventário?
                            </label>
                            <div className="small text-muted mt-1 ms-4">
                                Se selecionado, as quantidades das peças serão devolvidas ao stock atual.
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer bg-light border-0">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="button" className="btn btn-danger px-4" onClick={() => onConfirm(restoreParts)}>
                            Confirmar Eliminação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteReportModal;
