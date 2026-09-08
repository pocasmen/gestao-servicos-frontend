import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  User,
  Wrench,
  Clock,
  ExternalLink,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { GroupedMetricReportItem } from '../../types/analytics';

interface ExpandedReportsTableProps {
  reports: GroupedMetricReportItem[];
  onOpenReport: (reportId: number) => void;
  renderClassificationBadge: (classification?: string | null) => React.ReactNode;
}

type SortField =
  | 'reportNumber'
  | 'serviceDate'
  | 'classification'
  | 'clientName'
  | 'equipmentName'
  | 'technicians'
  | 'hours';

type SortDirection = 'asc' | 'desc';

export const ExpandedReportsTable: React.FC<ExpandedReportsTableProps> = ({
  reports,
  onOpenReport,
  renderClassificationBadge,
}) => {
  const [sortField, setSortField] = useState<SortField>('serviceDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'hours' || field === 'serviceDate' || field === 'reportNumber' ? 'desc' : 'asc');
    }
  };

  const sortedReports = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    return [...reports].sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];

      if (sortField === 'technicians') {
        av = (a.technicians || []).join(', ');
        bv = (b.technicians || []).join(', ');
      } else if (sortField === 'hours') {
        av = Number(a.hours || 0);
        bv = Number(b.hours || 0);
      } else if (sortField === 'reportNumber') {
        const aNum = Number(String(a.reportNumber).replace(/\D/g, ''));
        const bNum = Number(String(b.reportNumber).replace(/\D/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          av = aNum;
          bv = bNum;
        }
      }

      if (av === null || av === undefined || av === '') return 1;
      if (bv === null || bv === undefined || bv === '') return -1;

      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), 'pt', { numeric: true, sensitivity: 'base' });
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [reports, sortField, sortDir]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="opacity-40 ms-1" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-primary ms-1" />
    ) : (
      <ChevronDown size={12} className="text-primary ms-1" />
    );
  };

  if (!reports || reports.length === 0) {
    return (
      <div className="text-muted small py-2 px-3">
        Sem relatórios detalhados disponíveis para esta linha.
      </div>
    );
  }

  return (
    <div className="rounded-3 border overflow-hidden bg-white shadow-sm my-1">
      <div className="bg-light px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
        <span className="fw-bold small text-secondary d-flex align-items-center gap-1">
          <FileText size={14} className="text-primary" />
          Relatórios Agrupados ({reports.length})
        </span>
        <span className="badge bg-light text-muted border small">Clique no cabeçalho para ordenar • Clique num relatório para abrir</span>
      </div>
      <div className="table-responsive" style={{ maxHeight: '280px' }}>
        <table className="table table-hover table-sm mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
          <thead className="table-light text-secondary sticky-top" style={{ fontSize: '0.72rem', top: 0, zIndex: 1 }}>
            <tr>
              <th
                className="ps-3 user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('reportNumber')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Nº Relatório</span>
                  {renderSortIcon('reportNumber')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('serviceDate')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Data Serviço</span>
                  {renderSortIcon('serviceDate')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('classification')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Classificação</span>
                  {renderSortIcon('classification')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('clientName')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Cliente</span>
                  {renderSortIcon('clientName')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('equipmentName')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Equipamento</span>
                  {renderSortIcon('equipmentName')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('technicians')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Técnico(s)</span>
                  {renderSortIcon('technicians')}
                </div>
              </th>
              <th
                className="text-end pe-3 user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('hours')}
              >
                <div className="d-inline-flex align-items-center justify-content-end w-100">
                  <span>Horas</span>
                  {renderSortIcon('hours')}
                </div>
              </th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedReports.map(item => (
              <tr
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport(item.id);
                }}
                style={{ cursor: 'pointer' }}
                className="hover-bg-light"
              >
                <td className="ps-3 fw-bold text-primary">
                  #{item.reportNumber}
                </td>
                <td>
                  <span className="d-flex align-items-center gap-1 text-muted">
                    <Calendar size={12} />
                    {item.serviceDate ? new Date(item.serviceDate).toLocaleDateString('pt-PT') : '—'}
                  </span>
                </td>
                <td>
                  {renderClassificationBadge(item.classification)}
                </td>
                <td className="fw-semibold text-truncate" style={{ maxWidth: '180px' }}>
                  {item.clientName || '—'}
                </td>
                <td className="text-truncate" style={{ maxWidth: '180px' }}>
                  <span className="d-flex align-items-center gap-1">
                    <Wrench size={12} className="text-secondary" />
                    {item.equipmentName || '—'}
                  </span>
                </td>
                <td>
                  <span className="d-flex align-items-center gap-1">
                    <User size={12} className="text-secondary" />
                    {item.technicians && item.technicians.length > 0
                      ? item.technicians.join(', ')
                      : '—'}
                  </span>
                </td>
                <td className="text-end pe-3">
                  <span className="fw-semibold d-inline-flex align-items-center gap-1 text-dark">
                    <Clock size={11} className="text-muted" />
                    {Number(item.hours || 0).toFixed(1)}h
                  </span>
                </td>
                <td className="text-end pe-2">
                  <ExternalLink size={13} className="text-primary opacity-50" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpandedReportsTable;
