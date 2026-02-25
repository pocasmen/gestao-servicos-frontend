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
        <div className="row g-2 mb-2">
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-2 d-flex align-items-center small">
                        <i className="bi bi-gear-fill me-2 text-primary"></i>
                        Tipo de Serviço
                    </label>
                    <div className="d-flex flex-wrap gap-2">
                        {SERVICE_TYPES_LIST.map(type => (
                            <div key={type.id} className="form-check mb-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`service-type-${type.id}`}
                                    checked={serviceTypes.includes(type.id)}
                                    onChange={() => handleServiceTypeChange(type.id)}
                                />
                                <label className="form-check-label small" htmlFor={`service-type-${type.id}`}>{type.label}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="col-md-6">
                <div className="form-group p-2 border rounded bg-light h-100">
                    <label className="form-label fw-bold mb-2 d-flex align-items-center small">
                        <i className="bi bi-tags-fill me-2 text-primary"></i>
                        Classificação do Serviço
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={classification}
                        onChange={e => setClassification(e.target.value as ServiceClassification)}
                    >
                        {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>

                    {serviceTypes.length > 0 && !serviceTypes.every(t => t === 'remota') && (
                        <div className="mt-2 pt-2 border-top">
                            <div className="form-check form-switch pt-0">
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
