import React from 'react';

interface ReportDescriptionsProps {
    damage: string;
    setDamage: (val: string) => void;
    damageRef: React.RefObject<HTMLTextAreaElement | null>;
    description: string;
    setDescription: (val: string) => void;
    descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
    internalNotes: string;
    setInternalNotes: (val: string) => void;
    internalNotesRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ReportDescriptions: React.FC<ReportDescriptionsProps> = ({
    damage,
    setDamage,
    damageRef,
    description,
    setDescription,
    descriptionRef,
    internalNotes,
    setInternalNotes,
    internalNotesRef
}) => {
    return (
        <div className="d-flex flex-column gap-2">
            <div className="form-group p-2 border rounded bg-light">
                <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                    <i className="bi bi-exclamation-triangle-fill me-2 text-primary"></i>
                    Descrição da Avaria
                </label>
                <textarea
                    ref={damageRef}
                    className="form-control form-control-sm"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={damage}
                    onChange={e => setDamage(e.target.value)}
                    rows={1}
                ></textarea>
            </div>

            <div className="form-group p-2 border rounded bg-light">
                <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                    <i className="bi bi-pencil-square me-2 text-primary"></i>
                    Descrição da Intervenção
                </label>
                <textarea
                    ref={descriptionRef}
                    className="form-control form-control-sm"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={1}
                    required
                ></textarea>
            </div>

            <div className="form-group p-2 border rounded bg-light border-warning border-opacity-50">
                <label className="form-label fw-bold mb-1 d-flex align-items-center text-dark small">
                    <i className="bi bi-card-text me-2 text-warning"></i>
                    Notas Internas <span className="ms-2 badge bg-warning text-dark small" style={{ fontSize: '0.65rem' }}>Privado</span>
                </label>
                <textarea
                    ref={internalNotesRef}
                    className="form-control form-control-sm"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={1}
                    placeholder="Notas para a equipa técnica..."
                ></textarea>
            </div>
        </div>
    );
};

export default ReportDescriptions;
