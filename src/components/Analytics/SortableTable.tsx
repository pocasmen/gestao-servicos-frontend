import React, { useState, useMemo, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => React.ReactNode;
}

interface SortableTableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  defaultSortKey?: string;
  maxHeight?: string;
  renderExpandedRow?: (row: Record<string, any>) => ReactNode;
  rowKeyField?: string;
  footerRow?: Record<string, React.ReactNode>; // chave = col.key, valor = conteúdo a renderizar
}

const SortableTable: React.FC<SortableTableProps> = ({
  columns,
  data,
  defaultSortKey,
  maxHeight = '520px',
  renderExpandedRow,
  rowKeyField = 'groupKey',
  footerRow,
}) => {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey ?? (columns[0]?.key ?? ''));
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({});

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleRow = (key: string | number) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (col !== sortKey) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: 4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} style={{ marginLeft: 4, color: 'var(--primary-color)' }} />
      : <ChevronDown size={13} style={{ marginLeft: 4, color: 'var(--primary-color)' }} />;
  };

  if (data.length === 0) {
    return (
      <div className="text-center text-muted py-4 small">
        Sem dados para mostrar.
      </div>
    );
  }

  const isExpandable = !!renderExpandedRow;
  const colSpanTotal = columns.length + (isExpandable ? 1 : 0);

  return (
    <div style={{ maxHeight, overflowY: 'auto' }}>
      <table className="table table-hover table-sm mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
        <thead className="sticky-top" style={{ top: 0, zIndex: 2 }}>
          <tr>
            {isExpandable && (
              <th
                style={{
                  width: '36px',
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #e5e7eb',
                }}
              />
            )}
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="text-uppercase fw-semibold"
                style={{
                  cursor: 'pointer',
                  textAlign: col.align ?? 'left',
                  backgroundColor: '#f8f9fa',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  fontSize: '0.72rem',
                  letterSpacing: '0.05em',
                  borderBottom: '2px solid #e5e7eb',
                }}
              >
                {col.label}
                <SortIcon col={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const rowId = row[rowKeyField] ?? i;
            const isExpanded = !!expandedRows[rowId];
            const hasExpandableContent = isExpandable && renderExpandedRow(row) !== null;

            return (
              <React.Fragment key={rowId}>
                <tr
                  onClick={() => hasExpandableContent && toggleRow(rowId)}
                  style={{
                    color: 'var(--text-color)',
                    cursor: hasExpandableContent ? 'pointer' : 'default',
                    backgroundColor: isExpanded ? 'rgba(8, 48, 133, 0.03)' : undefined,
                    transition: 'background-color 0.15s ease',
                  }}
                  className={hasExpandableContent ? 'user-select-none' : ''}
                >
                  {isExpandable && (
                    <td className="text-center px-1" style={{ width: '36px' }}>
                      {hasExpandableContent && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-muted shadow-none border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(rowId);
                          }}
                          title={isExpanded ? 'Recolher' : 'Expandir relatórios'}
                          style={{ lineHeight: 1 }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-primary fw-bold" />
                          ) : (
                            <ChevronRight size={16} className="text-secondary" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align ?? 'left', color: 'var(--text-color)' }}
                    >
                      {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
                {isExpanded && hasExpandableContent && (
                  <tr style={{ backgroundColor: '#fcfdfe' }}>
                    <td colSpan={colSpanTotal} className="p-0 border-top-0">
                      <div className="p-3 border-bottom bg-light-subtle shadow-inner">
                        {renderExpandedRow(row)}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {footerRow && (
          <tfoot>
            <tr
              style={{
                backgroundColor: '#f1f5fe',
                borderTop: '2px solid #d1d5db',
                fontWeight: 700,
                fontSize: '0.86rem',
                color: 'var(--primary-color)',
                position: 'sticky',
                bottom: 0,
                zIndex: 1,
              }}
            >
              {isExpandable && <td style={{ backgroundColor: '#f1f5fe' }} />}
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{
                    textAlign: col.align ?? 'left',
                    padding: '10px 8px',
                    backgroundColor: '#f1f5fe',
                    borderTop: '2px solid #c7d2fe',
                  }}
                >
                  {footerRow[col.key] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default SortableTable;
