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
        <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm mt-3 animate__animated animate__fadeIn">
            <label className="text-dark fw-bold text-uppercase d-flex align-items-center mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                <i className="bi bi-journal-text me-2 text-primary opacity-50"></i>
                Notas Internas
                <span className="badge bg-warning bg-opacity-10 text-warning ms-3 px-2 py-1" style={{ fontSize: '0.65rem', letterSpacing: '0' }}>Oculto do Cliente</span>
            </label>
            <textarea
                ref={internalNotesRef}
                className="form-control form-control-sm border-white bg-white rounded-4 px-3 py-2 shadow-none fw-medium"
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                rows={2}
                style={{ overflow: 'hidden', resize: 'none', transition: 'height 0.2s ease-in-out' }}
                disabled={isPastOrCompleted}
                placeholder="Insira notas privadas para a equipa técnica..."
            />
        </div>
    );
};

export default ScheduleInternalNotes;
