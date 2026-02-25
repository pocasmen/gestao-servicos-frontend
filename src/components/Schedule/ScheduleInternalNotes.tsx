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
        <div className="form-group mt-3">
            <label className="text-secondary fw-bold">Notas Internas</label>
            <textarea
                ref={internalNotesRef}
                className="form-control"
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                rows={1}
                style={{ overflow: 'hidden', resize: 'none' }}
                disabled={isPastOrCompleted}
            />
        </div>
    );
};

export default ScheduleInternalNotes;
