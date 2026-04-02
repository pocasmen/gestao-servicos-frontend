import React from 'react';
import { ServiceClassification } from '../../constants/enums';
import { SERVICE_TYPES_LIST, SERVICE_CLASSIFICATIONS_LIST } from '../../constants';

interface ReportServiceInfoProps {
    serviceTypes: string[];
    setServiceTypes: React.Dispatch<React.SetStateAction<string[]>>;
    classification: ServiceClassification;
    setClassification: (val: ServiceClassification) => void;
    includesTravel: boolean;
    setIncludesTravel: (val: boolean) => void;
}

const ReportServiceInfo: React.FC<ReportServiceInfoProps> = ({
    serviceTypes,
    setServiceTypes,
    classification,
    setClassification,
    includesTravel,
    setIncludesTravel
}) => {
    const handleServiceTypeChange = (type: string) => {
        setServiceTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    return (
        <div className="row g-3 mb-3">
            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-gear-fill me-2 text-primary opacity-50"></i>
                        Tipo de Serviço
                    </label>
                    <div className="d-flex flex-wrap gap-3 mb-3 ps-1">
                        {SERVICE_TYPES_LIST.map(type => (
                            <div key={type.id} className="form-check mb-0 custom-checkbox">
                                <input
                                    className="form-check-input shadow-none"
                                    type="checkbox"
                                    id={`service-type-${type.id}`}
                                    checked={serviceTypes.includes(type.id)}
                                    onChange={() => handleServiceTypeChange(type.id)}
                                    style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem' }}
                                />
                                <label className="form-check-label small fw-medium text-dark ms-1 cursor-pointer" htmlFor={`service-type-${type.id}`}>{type.label}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="col-md-6">
                <div className="p-3 bg-white bg-opacity-80 border border-secondary border-opacity-25 rounded-4 h-100 shadow-sm">
                    <label className="text-dark fw-bold text-uppercase d-block mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                        <i className="bi bi-tags-fill me-2 text-primary opacity-50"></i>
                        Classificação do Serviço
                    </label>
                    <select
                        className="form-select form-select-sm border-light bg-white rounded-pill px-3 shadow-none mb-3"
                        value={classification}
                        onChange={e => setClassification(e.target.value as ServiceClassification)}
                    >
                        {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>

                    {serviceTypes.length > 0 && !serviceTypes.every(t => t === 'remota') && (
                        <div className="mt-auto pt-2 border-top border-light">
                            <div className="form-check form-switch pt-0 mt-2 mb-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="reportIncludesTravel"
                                    checked={includesTravel}
                                    onChange={(e) => setIncludesTravel(e.target.checked)}
                                />
                                <label className="form-check-label fw-bold text-primary small" htmlFor="reportIncludesTravel">
                                    Inclui deslocação
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportServiceInfo;
