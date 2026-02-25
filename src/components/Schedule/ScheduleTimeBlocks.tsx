import React from 'react';
import DatePicker from 'react-datepicker';
import { Trash2 } from 'lucide-react';

interface ScheduleTimeBlocksProps {
    timeBlocks: { start: Date; end: Date }[];
    handleBlockChange: (index: number, field: 'start' | 'end', value: Date | null) => void;
    handleAddBlock: () => void;
    handleRemoveBlock: (index: number) => void;
    isPastOrCompleted: boolean;
    sendToBacklog: boolean;
}

const ScheduleTimeBlocks: React.FC<ScheduleTimeBlocksProps> = ({
    timeBlocks,
    handleBlockChange,
    handleAddBlock,
    handleRemoveBlock,
    isPastOrCompleted,
    sendToBacklog
}) => {
    if (sendToBacklog) return null;

    return (
        <div className="form-group mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="text-secondary fw-bold">Horários do Serviço</label>
                {!isPastOrCompleted && (
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddBlock}>
                        + Adicionar Horário
                    </button>
                )}
            </div>

            {timeBlocks.map((block, index) => (
                <div key={index} className="row mb-3 align-items-end border-bottom pb-3">
                    <div className="col-md-5">
                        <div className="form-group mb-0">
                            <label className="small text-muted">Início ({index + 1})</label>
                            <DatePicker
                                selected={block.start}
                                onChange={(date: Date | null) => handleBlockChange(index, 'start', date)}
                                showTimeSelect
                                dateFormat="dd/MM/yyyy HH:mm"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                locale="pt"
                                className="form-control"
                                disabled={isPastOrCompleted}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="form-group mb-0">
                            <label className="small text-muted">Fim ({index + 1})</label>
                            <DatePicker
                                selected={block.end}
                                onChange={(date: Date | null) => handleBlockChange(index, 'end', date)}
                                showTimeSelect
                                dateFormat="dd/MM/yyyy HH:mm"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                locale="pt"
                                className="form-control"
                                disabled={isPastOrCompleted}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-2">
                        {!isPastOrCompleted && timeBlocks.length > 1 && (
                            <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => handleRemoveBlock(index)}>
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ScheduleTimeBlocks;
