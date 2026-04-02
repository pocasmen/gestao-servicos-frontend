import React from 'react';
import DatePicker from 'react-datepicker';
import { Trash2 } from 'lucide-react';
import { calculateHours } from '../../utils/dateCalculations';

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
        <div className="p-2 bg-white bg-opacity-50 border rounded-4 shadow-sm border-light mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="text-muted fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-clock-fill me-2 text-primary opacity-50"></i>
                    Horários do Serviço
                </label>
                {!isPastOrCompleted && (
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-bold shadow-sm" onClick={handleAddBlock} style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-plus-circle me-1"></i>
                        Adicionar Bloco
                    </button>
                )}
            </div>

            <div className="d-flex flex-column gap-1">
                {timeBlocks.map((block, index) => {
                    const blockHours = calculateHours(block.start, block.end);
                    return (
                        <div key={index} className={`px-3 py-1 rounded-3 bg-light bg-opacity-50 border border-light position-relative animate__animated animate__fadeIn`}>
                            <div className="row g-1 align-items-center">
                                <div className="col-md-5">
                                    <label className="small text-muted fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.65rem', letterSpacing: '0.03em' }}>
                                        Início ({index + 1})
                                    </label>
                                    <DatePicker
                                        selected={block.start}
                                        onChange={(date: Date | null) => handleBlockChange(index, 'start', date)}
                                        showTimeSelect
                                        dateFormat="dd/MM/yyyy HH:mm"
                                        timeFormat="HH:mm"
                                        timeIntervals={15}
                                        locale="pt"
                                        className="form-control form-control-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
                                        disabled={isPastOrCompleted}
                                        required
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="small text-muted fw-bold text-uppercase d-block mb-0" style={{ fontSize: '0.65rem', letterSpacing: '0.03em' }}>
                                        Fim ({index + 1})
                                    </label>
                                    <DatePicker
                                        selected={block.end}
                                        onChange={(date: Date | null) => handleBlockChange(index, 'end', date)}
                                        showTimeSelect
                                        dateFormat="dd/MM/yyyy HH:mm"
                                        timeFormat="HH:mm"
                                        timeIntervals={15}
                                        locale="pt"
                                        className="form-control form-control-sm border-light bg-white rounded-pill px-3 shadow-none fw-medium"
                                        disabled={isPastOrCompleted}
                                        required
                                    />
                                </div>
                                <div className="col-md-2 d-flex align-items-center justify-content-center gap-1">
                                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1 fw-bold" style={{ fontSize: '0.70rem' }}>
                                        {blockHours}h
                                    </span>
                                    {!isPastOrCompleted && timeBlocks.length > 1 && (
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-danger border-0 rounded-circle" 
                                            onClick={() => handleRemoveBlock(index)} 
                                            title="Remover horário"
                                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScheduleTimeBlocks;
