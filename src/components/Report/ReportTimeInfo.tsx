import React from 'react';
import { ScheduleEvent } from '../../types';

interface ReportTimeInfoProps {
    schedule: ScheduleEvent | null;
    hours: number | string;
    setHours: (val: number) => void;
}

const ReportTimeInfo: React.FC<ReportTimeInfoProps> = ({
    schedule,
    hours,
    setHours
}) => {
    return (
        <div className="row mb-3">
            <div className="col-md-8">
                {schedule?.timeBlocks && schedule.timeBlocks.length > 0 && (
                    <div className="form-group">
                        <label className="text-secondary fw-bold mb-1">Horários do Serviço (Agendamento)</label>
                        <div className="p-2 border rounded bg-light" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                            <ul className="mb-0 ps-3 small text-muted">
                                {schedule.timeBlocks.map((tb, idx) => (
                                    <li key={idx}>
                                        {new Date(tb.start).toLocaleDateString('pt-PT')} das {new Date(tb.start).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} às {new Date(tb.end).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
            <div className="col-md-4">
                <div className="form-group">
                    <label className="text-secondary fw-bold">Horas Trabalhadas</label>
                    <input
                        type="number"
                        className="form-control"
                        value={hours}
                        onChange={e => setHours(Number(e.target.value))}
                        required
                        min="0"
                        step="1"
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportTimeInfo;
