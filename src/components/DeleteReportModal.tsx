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
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="glass-card glass-card--solid border-0 shadow-lg overflow-hidden" style={{ width: '90%', maxWidth: '480px' }}>
                <div className="bg-danger px-4 py-3 d-flex justify-content-between align-items-center">
                    <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)' }}>Eliminar Relatório {report.report_number}</h5>
                    <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                </div>
                <div className="p-4">
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
                <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={() => onConfirm(restoreParts)}>
                        Confirmar Eliminação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteReportModal;
