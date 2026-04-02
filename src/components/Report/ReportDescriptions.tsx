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
            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm">
                <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-exclamation-triangle-fill me-2 text-primary opacity-50"></i>
                    Descrição da Avaria
                </label>
                <textarea
                    ref={damageRef}
                    className="form-control form-control-sm border-light bg-light rounded-4 px-3 py-2 shadow-none fw-medium"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={damage}
                    onChange={e => setDamage(e.target.value)}
                    rows={1}
                ></textarea>
            </div>

            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm">
                <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-pencil-square me-2 text-primary opacity-50"></i>
                    Descrição da Intervenção
                </label>
                <textarea
                    ref={descriptionRef}
                    className="form-control form-control-sm border-light bg-light rounded-4 px-3 py-2 shadow-none fw-medium"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={1}
                    required
                ></textarea>
            </div>

            <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm">
                <label className="text-dark fw-bold text-uppercase d-flex align-items-center mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-journal-text me-2 text-primary opacity-50"></i>
                    Notas Internas
                    <span className="badge bg-warning bg-opacity-10 text-warning ms-3 px-2 py-1" style={{ fontSize: '0.65rem', letterSpacing: '0' }}>Oculto do Cliente</span>
                </label>
                <textarea
                    ref={internalNotesRef}
                    className="form-control form-control-sm border-warning border-opacity-25 bg-white bg-opacity-75 rounded-4 px-3 py-2 shadow-none fw-medium"
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
