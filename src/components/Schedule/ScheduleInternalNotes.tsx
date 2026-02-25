import React, { useEffect } from 'react';

interface ScheduleInternalNotesProps {
    internalNotes: string;
    setInternalNotes: (val: string) => void;
    isPastOrCompleted: boolean;
    isTicketScheduling: boolean;
    internalNotesRef: React.RefObject<HTMLTextAreaElement | null>;
    isOpen: boolean;
}

const ScheduleInternalNotes: React.FC<ScheduleInternalNotesProps> = ({
    internalNotes,
    setInternalNotes,
    isPastOrCompleted,
    isTicketScheduling,
    internalNotesRef,
    isOpen
}) => {
    useEffect(() => {
        if (internalNotesRef.current) {
            internalNotesRef.current.style.height = 'auto';
            internalNotesRef.current.style.height = `${internalNotesRef.current.scrollHeight}px`;
        }
    }, [internalNotes, isOpen, internalNotesRef]);

    if (isTicketScheduling) return null;

    return (
        <div className="form-group mb-2 p-2 border rounded bg-light border-warning border-opacity-50 mt-2">
            <label className="form-label fw-bold mb-1 d-flex align-items-center text-dark small">
                <i className="bi bi-card-text me-2 text-warning"></i>
                Notas Internas <span className="ms-2 badge bg-warning text-dark small" style={{ fontSize: '0.65rem' }}>Privado</span>
            </label>
            <textarea
                ref={internalNotesRef}
                className="form-control form-control-sm"
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                rows={1}
                style={{ overflow: 'hidden', resize: 'none' }}
                disabled={isPastOrCompleted}
                placeholder="Notas para a equipa técnica..."
            />
        </div>
    );
};

export default ScheduleInternalNotes;
