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
        <>
            <div className="form-group mb-2">
                <label className="text-secondary fw-bold">Descrição da Avaria</label>
                <textarea
                    ref={damageRef}
                    className="form-control"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={damage}
                    onChange={e => setDamage(e.target.value)}
                    rows={1}
                ></textarea>
            </div>

            <div className="form-group mb-2">
                <label className="text-secondary fw-bold">Descrição da Intervenção</label>
                <textarea
                    ref={descriptionRef}
                    className="form-control"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={1}
                    required
                ></textarea>
            </div>

            <div className="form-group mb-3 p-2 bg-light border rounded">
                <label className="text-secondary fw-bold">Notas Internas (Não visível ao cliente)</label>
                <textarea
                    ref={internalNotesRef}
                    className="form-control"
                    style={{ overflow: 'hidden', resize: 'none' }}
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={1}
                    placeholder="Notas para a equipa técnica..."
                ></textarea>
            </div>
        </>
    );
};

export default ReportDescriptions;
