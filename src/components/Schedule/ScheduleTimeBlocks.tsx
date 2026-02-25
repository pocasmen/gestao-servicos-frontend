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
        <div className="form-group mb-2 p-2 border rounded bg-light">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-bold mb-0 d-flex align-items-center small">
                    <i className="bi bi-clock-fill me-2 text-primary"></i>
                    Horários do Serviço
                </label>
                {!isPastOrCompleted && (
                    <button type="button" className="btn btn-xs btn-outline-primary rounded-pill px-2 py-0" onClick={handleAddBlock} style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-plus-circle me-1"></i>
                        Adicionar
                    </button>
                )}
            </div>

            {timeBlocks.map((block, index) => (
                <div key={index} className={`row g-2 align-items-end ${index < timeBlocks.length - 1 ? 'border-bottom pb-2 mb-2' : ''}`}>
                    <div className="col-md-5">
                        <div className="form-group mb-0">
                            <label className="small text-muted fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Início ({index + 1})</label>
                            <DatePicker
                                selected={block.start}
                                onChange={(date: Date | null) => handleBlockChange(index, 'start', date)}
                                showTimeSelect
                                dateFormat="dd/MM/yyyy HH:mm"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                locale="pt"
                                className="form-control form-control-sm"
                                disabled={isPastOrCompleted}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="form-group mb-0">
                            <label className="small text-muted fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Fim ({index + 1})</label>
                            <DatePicker
                                selected={block.end}
                                onChange={(date: Date | null) => handleBlockChange(index, 'end', date)}
                                showTimeSelect
                                dateFormat="dd/MM/yyyy HH:mm"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                locale="pt"
                                className="form-control form-control-sm"
                                disabled={isPastOrCompleted}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-2 text-end">
                        {!isPastOrCompleted && timeBlocks.length > 1 && (
                            <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveBlock(index)} title="Remover horário">
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
