import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Filter, RotateCcw } from 'lucide-react';
import apiClient from '../../apiClient';
import { AnalyticsFilterConfig, AnalyticsFilters } from '../../types/analytics';

interface AnalyticsFilterBarProps {
  config: AnalyticsFilterConfig;
  value: AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
  onApply: (f: AnalyticsFilters) => void;
}

// Atalhos de período
const PERIOD_SHORTCUTS = [
  { label: 'Últimos 3 meses', fn: () => { const e = new Date(); const s = new Date(); s.setMonth(s.getMonth() - 3); return { s, e }; } },
  { label: 'Este ano', fn: () => { const e = new Date(); const s = new Date(e.getFullYear(), 0, 1); return { s, e }; } },
  { label: 'Ano passado', fn: () => { const y = new Date().getFullYear() - 1; return { s: new Date(y, 0, 1), e: new Date(y, 11, 31) }; } },
  { label: 'Últimos 12 meses', fn: () => { const e = new Date(); const s = new Date(); s.setFullYear(s.getFullYear() - 1); return { s, e }; } },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reparacao', label: 'Reparação' },
  { value: 'assistencia', label: 'Assistência' },
  { value: 'instalacao', label: 'Instalação' },
  { value: 'remota', label: 'Remota' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'geral', label: 'Geral' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'foss', label: 'Foss' },
  { value: 'msd', label: 'MSD' },
];

const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({ config, value, onChange, onApply }) => {
  const [draft, setDraft] = useState<AnalyticsFilters>(value);

  const update = useCallback((patch: Partial<AnalyticsFilters>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  // Carrega listas para multi-selects
  const { data: clients = [] } = useQuery({
    queryKey: ['filter-clients'],
    queryFn: async () => {
      const res = await apiClient.get('/api/clients');
      return res.data as { id: number; name: string }[];
    },
    enabled: config.clients,
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['filter-technicians'],
    queryFn: async () => {
      const res = await apiClient.get('/api/technicians?includeInactive=true');
      const all = res.data as { id: string; name: string; role?: string }[];
      return all.filter(t => t.role !== 'office_staff' && ['technician', 'admin', 'super_admin', 'inactive_technician'].includes(t.role || ''));
    },
    enabled: config.technicians,
    staleTime: 5 * 60 * 1000,
  });

  const applyShortcut = (fn: () => { s: Date; e: Date }) => {
    const { s, e } = fn();
    update({ startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0] });
  };

  const toggleClientId = (id: number) => {
    const next = draft.clientIds.includes(id)
      ? draft.clientIds.filter(x => x !== id)
      : [...draft.clientIds, id];
    update({ clientIds: next });
  };

  const toggleTechId = (id: string) => {
    const next = draft.technicianIds.includes(id)
      ? draft.technicianIds.filter(x => x !== id)
      : [...draft.technicianIds, id];
    update({ technicianIds: next });
  };

  const toggleServiceType = (st: string) => {
    const next = draft.serviceTypes.includes(st)
      ? draft.serviceTypes.filter(x => x !== st)
      : [...draft.serviceTypes, st];
    update({ serviceTypes: next });
  };

  const toggleClassification = (cl: string) => {
    const next = (draft.classifications || []).includes(cl)
      ? (draft.classifications || []).filter(x => x !== cl)
      : [...(draft.classifications || []), cl];
    update({ classifications: next });
  };

  const handleApply = () => {
    onChange(draft);
    onApply(draft);
  };

  const handleReset = () => {
    const reset: AnalyticsFilters = {
      ...draft,
      clientIds: [],
      technicianIds: [],
      serviceTypes: [],
      classifications: [],
    };
    setDraft(reset);
    onChange(reset);
    onApply(reset);
  };

  const startDate = draft.startDate ? new Date(draft.startDate) : null;
  const endDate = draft.endDate ? new Date(draft.endDate) : null;

  return (
    <div className="glass-card p-4 mb-4" style={{ color: 'var(--text-color)' }}>
      <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-light-subtle">
        <Filter size={18} className="text-primary" />
        <span className="fw-bold small text-uppercase" style={{ letterSpacing: '0.07em', color: 'var(--primary-color)' }}>
          Filtros de Pesquisa
        </span>
      </div>

      <div className="row g-3">
        {/* ─── Período ──────────────────────────────────────────────────────── */}
        {config.period && (
          <div className="col-12 col-md-6 col-xl-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Período</label>
            {/* Atalhos */}
            <div className="d-flex flex-wrap gap-1 mb-2">
              {PERIOD_SHORTCUTS.map(s => (
                <button
                  key={s.label}
                  type="button"
                  className="btn btn-light btn-sm rounded-pill border"
                  style={{ fontSize: '0.75rem', padding: '2px 10px', color: '#4b5563' }}
                  onClick={() => applyShortcut(s.fn)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="d-flex gap-2 align-items-center">
              <DatePicker
                selected={startDate}
                onChange={(d: Date | null) => update({ startDate: d?.toISOString().split('T')[0] ?? '' })}
                dateFormat="dd/MM/yyyy"
                className="form-control form-control-sm bg-white text-dark border"
                placeholderText="Início"
                selectsStart
                startDate={startDate}
                endDate={endDate}
              />
              <span className="text-secondary small fw-bold">→</span>
              <DatePicker
                selected={endDate}
                onChange={(d: Date | null) => update({ endDate: d?.toISOString().split('T')[0] ?? '' })}
                dateFormat="dd/MM/yyyy"
                className="form-control form-control-sm bg-white text-dark border"
                placeholderText="Fim"
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
              />
            </div>
          </div>
        )}

        {/* ─── Meses ─────────────────────────────────────────────────────────── */}
        {config.months && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small fw-semibold text-secondary mb-1">Nº de Meses</label>
            <input
              type="number"
              className="form-control form-control-sm bg-white text-dark border"
              value={draft.months}
              min={1}
              max={120}
              onChange={e => update({ months: parseInt(e.target.value, 10) || 12 })}
            />
          </div>
        )}

        {/* ─── Tipo de Serviço (input p/ service-frequency) ─────────────────── */}
        {config.serviceTypeFixed !== undefined && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small fw-semibold text-secondary mb-1">Tipo de Serviço</label>
            <select
              className="form-select form-select-sm bg-white text-dark border"
              value={draft.serviceType}
              onChange={e => update({ serviceType: e.target.value })}
            >
              {SERVICE_TYPE_OPTIONS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
            </select>
          </div>
        )}

        {/* ─── Granularidade ─────────────────────────────────────────────────── */}
        {config.granularity && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small fw-semibold text-secondary mb-1">Granularidade</label>
            <div className="btn-group btn-group-sm w-100">
              {(['month', 'week', 'quarter'] as const).filter(g =>
                g !== 'quarter' || draft.granularity === 'quarter'
              ).map(g => (
                <button
                  key={g}
                  type="button"
                  className={`btn ${draft.granularity === g ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => update({ granularity: g })}
                  style={{ fontSize: '0.75rem' }}
                >
                  {g === 'month' ? 'Mês' : g === 'week' ? 'Semana' : 'Trimestre'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Metric toggle ─────────────────────────────────────────────────── */}
        {config.metric && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small fw-semibold text-secondary mb-1">Métrica</label>
            <div className="btn-group btn-group-sm w-100">
              <button
                type="button"
                className={`btn ${draft.metric === 'count' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => update({ metric: 'count' })}
                style={{ fontSize: '0.75rem' }}
              >
                Contagem
              </button>
              <button
                type="button"
                className={`btn ${draft.metric === 'hours' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => update({ metric: 'hours' })}
                style={{ fontSize: '0.75rem' }}
              >
                Horas
              </button>
            </div>
          </div>
        )}

        {/* ─── Clientes ──────────────────────────────────────────────────────── */}
        {config.clients && clients.length > 0 && (
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center">
              <span>Clientes</span>
              {draft.clientIds.length > 0 && (
                <span className="badge bg-primary rounded-pill ms-2" style={{ fontSize: '0.65rem' }}>
                  {draft.clientIds.length} selecionado(s)
                </span>
              )}
            </label>
            <div
              className="rounded-3 p-2 bg-white border"
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
              }}
            >
              <div className="row g-1">
                {clients.map(c => (
                  <div key={c.id} className="col-12 col-sm-6">
                    <label className="d-flex align-items-center gap-2 py-1 px-2 rounded-2"
                      style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-color)' }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={draft.clientIds.includes(c.id)}
                        onChange={() => toggleClientId(c.id)}
                      />
                      <span className="text-truncate">{c.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Técnicos ──────────────────────────────────────────────────────── */}
        {config.technicians && technicians.length > 0 && (
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center">
              <span>Técnicos</span>
              {draft.technicianIds.length > 0 && (
                <span className="badge bg-primary rounded-pill ms-2" style={{ fontSize: '0.65rem' }}>
                  {draft.technicianIds.length} selecionado(s)
                </span>
              )}
            </label>
            <div
              className="rounded-3 p-2 bg-white border"
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
              }}
            >
              <div className="row g-1">
                {technicians.map(t => (
                  <div key={t.id} className="col-12 col-sm-6">
                    <label className="d-flex align-items-center gap-2 py-1 px-2 rounded-2"
                      style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-color)' }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={draft.technicianIds.includes(t.id)}
                        onChange={() => toggleTechId(t.id)}
                      />
                      <span className="text-truncate">
                        {t.name}
                        {t.role === 'inactive_technician' && (
                          <span className="text-muted small ms-1" style={{ fontSize: '0.72rem' }}>(Inativo)</span>
                        )}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Tipos de Serviço (checkboxes) ─────────────────────────────────── */}
        {config.serviceTypes && (
          <div className="col-12">
            <label className="form-label small fw-semibold text-secondary mb-2">Tipos de Serviço</label>
            <div className="d-flex flex-wrap gap-3 p-2 bg-white rounded-3 border">
              {SERVICE_TYPE_OPTIONS.map(st => (
                <label key={st.value} className="d-flex align-items-center gap-2"
                  style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-color)' }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={draft.serviceTypes.includes(st.value)}
                    onChange={() => toggleServiceType(st.value)}
                  />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ─── Classificação de Serviço (checkboxes) ────────────────────────── */}
        {config.classifications && (
          <div className="col-12">
            <label className="form-label small fw-semibold text-secondary mb-2">Classificação de Serviço</label>
            <div className="d-flex flex-wrap gap-3 p-2 bg-white rounded-3 border">
              {CLASSIFICATION_OPTIONS.map(cl => (
                <label key={cl.value} className="d-flex align-items-center gap-2"
                  style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-color)' }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={(draft.classifications || []).includes(cl.value)}
                    onChange={() => toggleClassification(cl.value)}
                  />
                  <span>{cl.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Botões ─────────────────────────────────────────────────────────── */}
      <div className="d-flex gap-2 justify-content-end mt-4 pt-2 border-top border-light-subtle">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
          onClick={handleReset}
        >
          <RotateCcw size={13} /> Limpar
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-pill px-4 d-flex align-items-center gap-1 shadow-sm"
          onClick={handleApply}
        >
          <Filter size={13} /> Aplicar Filtros
        </button>
      </div>
    </div>
  );
};

export default AnalyticsFilterBar;
