import React, { useState, useMemo } from 'react';
import {
  Package,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  Wrench,
  User,
  ExternalLink,
} from 'lucide-react';
import { ClientPartDetail } from '../../types/analytics';

interface ExpandedClientPartsTableProps {
  parts: ClientPartDetail[];
  onOpenReport?: (reportId: number) => void;
}

type SortField = 'reference' | 'designation' | 'unitPrice' | 'quantity' | 'totalCost' | 'reportCount';
type SortDirection = 'asc' | 'desc';

export const ExpandedClientPartsTable: React.FC<ExpandedClientPartsTableProps> = ({ parts, onOpenReport }) => {
  const [sortField, setSortField] = useState<SortField>('totalCost');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [expandedPartIds, setExpandedPartIds] = useState<Record<number, boolean>>({});

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'reference' || field === 'designation' ? 'asc' : 'desc');
    }
  };

  const togglePart = (partId: number) => {
    setExpandedPartIds(prev => ({
      ...prev,
      [partId]: !prev[partId],
    }));
  };

  const sortedParts = useMemo(() => {
    if (!parts || parts.length === 0) return [];
    return [...parts].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];

      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;

      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), 'pt', { numeric: true, sensitivity: 'base' });
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [parts, sortField, sortDir]);

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

  if (!parts || parts.length === 0) {
    return (
      <div className="text-muted small py-2 px-3">
        Sem peças individuais registadas para este cliente no período selecionado.
      </div>
    );
  }

  return (
    <div className="rounded-3 border overflow-hidden bg-white shadow-sm my-1">
      <div className="bg-light px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
        <span className="fw-bold small text-secondary d-flex align-items-center gap-1">
          <Package size={14} className="text-primary" />
          Peças Utilizadas ({parts.length})
        </span>
        <span className="badge bg-light text-muted border small">
          Clique numa peça para ver os relatórios associados
        </span>
      </div>
      <div className="table-responsive" style={{ maxHeight: '350px' }}>
        <table className="table table-hover table-sm mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
          <thead className="table-light text-secondary sticky-top" style={{ fontSize: '0.72rem', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '32px' }}></th>
              <th
                className="ps-2 user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('reference')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Referência</span>
                  {renderSortIcon('reference')}
                </div>
              </th>
              <th
                className="user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('designation')}
              >
                <div className="d-inline-flex align-items-center">
                  <span>Designação</span>
                  {renderSortIcon('designation')}
                </div>
              </th>
              <th
                className="text-end user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('unitPrice')}
              >
                <div className="d-inline-flex align-items-center justify-content-end w-100">
                  <span>Preço Unit. (€)</span>
                  {renderSortIcon('unitPrice')}
                </div>
              </th>
              <th
                className="text-end user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('quantity')}
              >
                <div className="d-inline-flex align-items-center justify-content-end w-100">
                  <span>Quantidade</span>
                  {renderSortIcon('quantity')}
                </div>
              </th>
              <th
                className="text-end user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('totalCost')}
              >
                <div className="d-inline-flex align-items-center justify-content-end w-100">
                  <span>Custo Total (€)</span>
                  {renderSortIcon('totalCost')}
                </div>
              </th>
              <th
                className="text-end pe-3 user-select-none"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('reportCount')}
              >
                <div className="d-inline-flex align-items-center justify-content-end w-100">
                  <span>Nº Relatórios</span>
                  {renderSortIcon('reportCount')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParts.map((item) => {
              const isExpanded = !!expandedPartIds[item.partId];
              const hasReports = Array.isArray(item.reports) && item.reports.length > 0;

              return (
                <React.Fragment key={item.partId}>
                  <tr
                    onClick={() => hasReports && togglePart(item.partId)}
                    style={{
                      cursor: hasReports ? 'pointer' : 'default',
                      backgroundColor: isExpanded ? 'rgba(8, 48, 133, 0.03)' : undefined,
                      transition: 'background-color 0.15s ease',
                    }}
                    className={hasReports ? 'user-select-none hover-bg-light' : ''}
                  >
                    <td className="text-center px-1" style={{ width: '32px' }}>
                      {hasReports && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-muted shadow-none border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePart(item.partId);
                          }}
                          title={isExpanded ? 'Recolher relatórios' : 'Expandir relatórios desta peça'}
                          style={{ lineHeight: 1 }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={15} className="text-primary fw-bold" />
                          ) : (
                            <ChevronRight size={15} className="text-secondary" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="ps-2 fw-bold text-primary">
                      {item.reference}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '240px' }}>
                      {item.designation || '—'}
                    </td>
                    <td className="text-end">
                      €{Number(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="text-end fw-semibold">
                      {Number(item.quantity || 0).toFixed(0)}
                    </td>
                    <td className="text-end fw-bold text-success">
                      €{Number(item.totalCost || 0).toFixed(2)}
                    </td>
                    <td className="text-end pe-3">
                      <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">
                        {item.reportCount ?? (item.reports?.length || 1)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && hasReports && (
                    <tr style={{ backgroundColor: '#fcfdfe' }}>
                      <td colSpan={7} className="p-0 border-top-0">
                        <div className="py-2 px-3 ps-4 bg-light-subtle border-bottom">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="small fw-semibold text-secondary d-flex align-items-center gap-1">
                              <FileText size={13} className="text-primary" />
                              Relatórios onde a peça foi utilizada ({item.reports!.length})
                            </span>
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              Clique no relatório para abrir
                            </span>
                          </div>
                          <div className="table-responsive rounded border bg-white shadow-xs">
                            <table className="table table-hover table-sm mb-0 align-middle" style={{ fontSize: '0.75rem' }}>
                              <thead className="table-light text-secondary" style={{ fontSize: '0.7rem' }}>
                                <tr>
                                  <th className="ps-3">Nº Relatório</th>
                                  <th>Data</th>
                                  <th>Equipamento</th>
                                  <th>Técnico(s)</th>
                                  <th className="text-end">Qtd. Aplicada</th>
                                  <th style={{ width: '36px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.reports!.map((rep) => (
                                  <tr
                                    key={rep.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenReport) onOpenReport(rep.id);
                                    }}
                                    style={{ cursor: onOpenReport ? 'pointer' : 'default' }}
                                    className="hover-bg-light"
                                  >
                                    <td className="ps-3 fw-bold text-primary">
                                      #{rep.reportNumber}
                                    </td>
                                    <td>
                                      <span className="d-flex align-items-center gap-1 text-muted">
                                        <Calendar size={11} />
                                        {rep.serviceDate ? new Date(rep.serviceDate).toLocaleDateString('pt-PT') : '—'}
                                      </span>
                                    </td>
                                    <td className="text-truncate" style={{ maxWidth: '180px' }}>
                                      <span className="d-flex align-items-center gap-1">
                                        <Wrench size={11} className="text-secondary" />
                                        {rep.equipmentName || '—'}
                                      </span>
                                    </td>
                                    <td className="text-truncate" style={{ maxWidth: '180px' }}>
                                      <span className="d-flex align-items-center gap-1">
                                        <User size={11} className="text-secondary" />
                                        {rep.technicians && rep.technicians.length > 0 ? rep.technicians.join(', ') : '—'}
                                      </span>
                                    </td>
                                    <td className="text-end fw-semibold">
                                      {Number(rep.quantity || 0).toFixed(0)} un
                                    </td>
                                    <td className="text-end pe-2">
                                      {onOpenReport && <ExternalLink size={12} className="text-primary opacity-50" />}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpandedClientPartsTable;
