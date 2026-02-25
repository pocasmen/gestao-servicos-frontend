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
        <div className="row mb-3">
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
                <div className="form-group">
                    <label className="text-secondary fw-bold">Horas Trabalhadas</label>
                    <div className="input-group">
                        <input
                            type="number"
                            className="form-control"
                            value={hours}
                            onChange={e => setHours(Number(e.target.value))}
                            required
                            min="0"
                            step="1"
                        />
                        <span className="input-group-text">h</span>
                    </div>
                    <small className="text-muted">Calculado auto. ou ajuste manual</small>
                </div>
            </div>
        </div>
    );
};

export default ReportTimeInfo;
