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
        <>
            <div className="row mb-3">
                <div className="col-md-6">
                    <div className="form-group">
                        <label className="text-secondary fw-bold">Tipo de Serviço</label>
                        <div className="d-flex flex-wrap border p-2 rounded bg-light">
                            {SERVICE_TYPES_LIST.map(type => (
                                <div key={type.id} className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`service-type-${type.id}`}
                                        checked={serviceTypes.includes(type.id)}
                                        onChange={() => handleServiceTypeChange(type.id)}
                                    />
                                    <label className="form-check-label" htmlFor={`service-type-${type.id}`}>{type.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="form-group">
                        <label className="text-secondary fw-bold">Classificação do Serviço</label>
                        <select
                            className="form-control"
                            value={classification}
                            onChange={e => setClassification(e.target.value as ServiceClassification)}
                        >
                            {SERVICE_CLASSIFICATIONS_LIST.map(item => (
                                <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {serviceTypes.length > 0 && !serviceTypes.every(t => t === 'remota') && (
                <div className="form-group mb-3">
                    <div className="form-check form-switch border p-2 rounded bg-light">
                        <input
                            className="form-check-input ms-0 me-2"
                            type="checkbox"
                            id="reportIncludesTravel"
                            checked={includesTravel}
                            onChange={(e) => setIncludesTravel(e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-primary" htmlFor="reportIncludesTravel">
                            Inclui deslocação às instalações do cliente
                        </label>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReportServiceInfo;
