import React from 'react';
import { ScheduleEvent } from '../../types';
import ScheduleTimeBlocks from '../Schedule/ScheduleTimeBlocks';

interface ReportTimeInfoProps {
    schedule: ScheduleEvent | null;
    hours: number | string;
    setHours: (val: number) => void;
    timeBlocks: { start: Date; end: Date }[];
    handleBlockChange: (index: number, field: 'start' | 'end', value: Date | null) => void;
    handleAddBlock: () => void;
    handleRemoveBlock: (index: number) => void;
}

const ReportTimeInfo: React.FC<ReportTimeInfoProps> = ({
    schedule,
    hours,
    setHours,
    timeBlocks,
    handleBlockChange,
    handleAddBlock,
    handleRemoveBlock
}) => {
    return (
        <div className="row g-3 mb-3">
            <div className="col-md-8">
                <ScheduleTimeBlocks
                    timeBlocks={timeBlocks}
                    handleBlockChange={handleBlockChange}
                    handleAddBlock={handleAddBlock}
                    handleRemoveBlock={handleRemoveBlock}
                    isPastOrCompleted={false}
                    sendToBacklog={false}
                />
            </div>
            <div className="col-md-4">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 shadow-sm h-100 d-flex flex-column justify-content-center align-items-center mb-3">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2 text-center" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-hourglass-split me-2 text-primary opacity-50"></i>
                        Horas Totais
                    </label>
                    <div className="input-group input-group-sm" style={{ maxWidth: '120px' }}>
                        <input
                            type="number"
                            className="form-control form-control-sm border-light bg-light rounded-start-pill px-3 shadow-none fw-bold text-center text-primary fs-5 py-2"
                            value={hours}
                            onChange={e => setHours(Number(e.target.value))}
                            required
                            min="0"
                            step="1"
                        />
                        <span className="input-group-text bg-light border-light border-start-0 rounded-end-pill fw-bold text-muted px-3">h</span>
                    </div>
                    <small className="text-muted mt-2 text-center d-block opacity-75" style={{ fontSize: '0.65rem' }}>
                        Automático / Manual
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ReportTimeInfo;
