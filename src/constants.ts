import { StockType, ServiceClassification, SchedulePriority } from './constants/enums';

export const STOCK_TYPE_LABELS: Record<StockType, string> = {
    [StockType.GENERAL]: 'Geral',
    [StockType.CONTRACT]: 'Contrato',
    [StockType.CLIENT]: 'Cliente',
    [StockType.WARRANTY]: 'Garantia',
};

// Valores lowercase que correspondem ao que vem do backend/BD
export const SERVICE_TYPES = {
    REPARACAO: 'reparacao',
    INSTALACAO: 'instalacao',
    ASSISTENCIA: 'assistencia',
    MANUTENCAO: 'manutencao',
    REMOTA: 'remota',
} as const;

// Mapeamento de valores lowercase para labels formatados
export const SERVICE_TYPE_LABELS: Record<string, string> = {
    'reparacao': 'Reparação',
    'instalacao': 'Instalação',
    'assistencia': 'Assistência',
    'manutencao': 'Manutenção',
    'remota': 'Remota',
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

export const SCHEDULE_PRIORITY_LABELS: Record<SchedulePriority, string> = {
    [SchedulePriority.HIGH]: 'Alta',
    [SchedulePriority.MEDIUM]: 'Média',
    [SchedulePriority.LOW]: 'Baixa',
};

export const SCHEDULE_PRIORITIES_LIST = [
    { id: SchedulePriority.HIGH, label: SCHEDULE_PRIORITY_LABELS[SchedulePriority.HIGH] },
    { id: SchedulePriority.MEDIUM, label: SCHEDULE_PRIORITY_LABELS[SchedulePriority.MEDIUM] },
    { id: SchedulePriority.LOW, label: SCHEDULE_PRIORITY_LABELS[SchedulePriority.LOW] },
];

