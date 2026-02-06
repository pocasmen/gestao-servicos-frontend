import { StockType, ServiceClassification } from './constants/enums';

export const STOCK_TYPE_LABELS: Record<StockType, string> = {
    [StockType.GENERAL]: 'Geral',
    [StockType.CONTRACT]: 'Contrato',
    [StockType.CLIENT]: 'Cliente',
    [StockType.WARRANTY]: 'Garantia',
};

export const SERVICE_TYPES = {
    REPARACAO: 'reparacao',
    INSTALACAO: 'instalacao',
    ASSISTENCIA: 'assistencia',
    MANUTENCAO: 'manutencao',
    REMOTA: 'remota',
} as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
    [SERVICE_TYPES.REPARACAO]: 'Reparação',
    [SERVICE_TYPES.INSTALACAO]: 'Instalação',
    [SERVICE_TYPES.ASSISTENCIA]: 'Assistência',
    [SERVICE_TYPES.MANUTENCAO]: 'Manutenção',
    [SERVICE_TYPES.REMOTA]: 'Remota',
};

export const SERVICE_TYPES_LIST = [
    { id: SERVICE_TYPES.REPARACAO, label: SERVICE_TYPE_LABELS[SERVICE_TYPES.REPARACAO] },
    { id: SERVICE_TYPES.INSTALACAO, label: SERVICE_TYPE_LABELS[SERVICE_TYPES.INSTALACAO] },
    { id: SERVICE_TYPES.ASSISTENCIA, label: SERVICE_TYPE_LABELS[SERVICE_TYPES.ASSISTENCIA] },
    { id: SERVICE_TYPES.MANUTENCAO, label: SERVICE_TYPE_LABELS[SERVICE_TYPES.MANUTENCAO] },
    { id: SERVICE_TYPES.REMOTA, label: SERVICE_TYPE_LABELS[SERVICE_TYPES.REMOTA] },
];

export const SERVICE_CLASSIFICATION_LABELS: Record<ServiceClassification, string> = {
    [ServiceClassification.GERAL]: 'Geral',
    [ServiceClassification.CONTRATO]: 'Contrato',
    [ServiceClassification.GARANTIA]: 'Garantia',
    [ServiceClassification.OFERTA]: 'Oferta',
};

export const SERVICE_CLASSIFICATIONS_LIST = [
    { id: ServiceClassification.GERAL, label: SERVICE_CLASSIFICATION_LABELS[ServiceClassification.GERAL] },
    { id: ServiceClassification.CONTRATO, label: SERVICE_CLASSIFICATION_LABELS[ServiceClassification.CONTRATO] },
    { id: ServiceClassification.GARANTIA, label: SERVICE_CLASSIFICATION_LABELS[ServiceClassification.GARANTIA] },
    { id: ServiceClassification.OFERTA, label: SERVICE_CLASSIFICATION_LABELS[ServiceClassification.OFERTA] },
];
