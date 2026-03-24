import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Download, Upload, Loader2, Database, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import logger from '../utils/logger';
import { useConfirm } from '../contexts/ConfirmContext';
import InventoryBatchImageUpload from '../components/Inventory/InventoryBatchImageUpload';

const DataPage: React.FC = () => {
  const { alert } = useConfirm();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number, percentage: number } | null>(null);
  const [importResults, setImportResults] = useState<{ updated: number, notFound: number } | null>(null);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ['admin_inventory_all'],
    queryFn: async () => {
      const response = await apiClient.get('/api/inventory/all-export');
      return response.data.data || [];
    }
  });

  const handleExport = () => {
    if (!inventoryData || inventoryData.length === 0) {
      alert('Não existem dados para exportar.');
      return;
    }

    setIsExporting(true);
    try {
      // Get all unique keys from all items to ensure we have all columns
      const headers = Object.keys(inventoryData[0]);

      const csvRows = [];
      // Add headers
      csvRows.push(headers.join(';'));

      // Add data
      for (const row of inventoryData) {
        const values = headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '';
          // Escape quotes and ensure semicolon doesn't break format
          // Using double quotes around values is safer
          let formattedVal = ('' + val).replace(/"/g, '""');
          return `"${formattedVal}"`;
        });
        csvRows.push(values.join(';'));
      }

      // Add BOM for Excel compatibility with UTF-8
      const csvContent = "\ufeff" + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventario_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      logger.error(err, 'Error exporting CSV:');
      alert('Erro ao exportar ficheiro CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    setIsBatchUploadOpen(true);
  };

  const handleImportPricesClick = () => {
    setImportResults(null);
    setImportProgress(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
          alert('Ficheiro vazio ou sem dados.');
          setIsImporting(false);
          return;
        }

        const delimiter = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

        const refIndex = headers.findIndex(h => h.includes('ref'));
        const priceIndex = headers.findIndex(h => h.includes('pre'));

        if (refIndex === -1 || priceIndex === -1) {
          alert('Não foi possível encontrar as colunas Referência e/ou Preço no cabeçalho.');
          setIsImporting(false);
          return;
        }

        const dataToSend = [];
        const rowRegex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(rowRegex);
          if (row.length > Math.max(refIndex, priceIndex)) {
            dataToSend.push({
              reference: row[refIndex].replace(/^"|"$/g, '').trim(),
              price: row[priceIndex].replace(/^"|"$/g, '').trim()
            });
          }
        }

        if (dataToSend.length === 0) {
          alert('Nenhum dado válido para importar.');
          setIsImporting(false);
          return;
        }

        const chunkSize = 25;
        let totalUpdated = 0;
        let totalNotFound = 0;

        setImportProgress({ current: 0, total: dataToSend.length, percentage: 0 });

        for (let i = 0; i < dataToSend.length; i += chunkSize) {
          const chunk = dataToSend.slice(i, i + chunkSize);
          try {
            const response = await apiClient.post('/api/inventory/import-prices', chunk);
            totalUpdated += response.data.updated || 0;
            totalNotFound += response.data.notFound || 0;
          } catch (err) {
            logger.error(err, 'Erro ao importar lote CSV');
          }

          const processed = Math.min(i + chunkSize, dataToSend.length);
          setImportProgress({
            current: processed,
            total: dataToSend.length,
            percentage: Math.round((processed / dataToSend.length) * 100)
          });

          // Small delay to let UI breathe and show progress for fast connections
          if (dataToSend.length > chunkSize) {
            await new Promise(resolve => setTimeout(resolve, 80));
          }
        }

        queryClient.invalidateQueries({ queryKey: ['admin_inventory_all'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });

        setImportResults({ updated: totalUpdated, notFound: totalNotFound });
      } catch (err) {
        logger.error(err, 'Error parsing CSV:');
        alert('Erro ao processar o ficheiro CSV.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      alert('Erro ao ler o ficheiro.');
      setIsImporting(false);
    }
    reader.readAsText(file);
  };

  if (error) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger">Erro ao carregar dados do inventário.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 d-flex align-items-center gap-2">
            <Database className="text-primary" /> Dados de Administração
          </h1>
          <p className="text-muted">Gestão e exportação completa de dados do sistema.</p>
        </div>
        <div className="d-flex gap-2">
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            className="btn btn-outline-success d-flex align-items-center gap-2"
            onClick={handleImportPricesClick}
            disabled={isImporting || isLoading}
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            Importar Preços
          </button>
          <button
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={handleImport}
          >
            <Upload size={18} /> Importar
          </button>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white border-bottom py-3">
          <h5 className="card-title mb-0 d-flex align-items-center gap-2">
            <TableIcon size={20} className="text-secondary" /> Inventário Completo ({inventoryData?.length || 0} itens)
          </h5>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center">
              <Loader2 size={40} className="animate-spin text-primary mb-3 mx-auto" />
              <p className="text-muted">A carregar todos os dados do inventário...</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '70vh' }}>
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="bg-light sticky-top">
                  <tr>
                    {inventoryData && inventoryData.length > 0 && Object.keys(inventoryData[0]).map(key => (
                      <th key={key} className="text-nowrap px-3 py-2 small fw-bold text-uppercase text-secondary" style={{ fontSize: '0.75rem' }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryData && inventoryData.map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      {Object.keys(item).map(key => (
                        <td key={`${item.id || idx}-${key}`} className="text-nowrap px-3 py-2 small text-muted border-bottom-0" style={{ fontSize: '0.85rem' }}>
                          {item[key] === null || item[key] === undefined ?
                            <span className="text-light-emphasis italic">null</span> :
                            typeof item[key] === 'boolean' ?
                              (item[key] ? <span className="badge bg-success-subtle text-success border border-success-subtle">true</span> : <span className="badge bg-danger-subtle text-danger border border-danger-subtle">false</span>) :
                              String(item[key])
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <InventoryBatchImageUpload
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
      />

      {/* Import Progress / Results Modal */}
      {(isImporting || importResults) && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <div className="modal-header border-bottom-0 p-4 pb-2">
                <h5 className="modal-title fw-bold">Importar Preços</h5>
                {importResults && (
                  <button type="button" className="btn-close" onClick={() => setImportResults(null)}></button>
                )}
              </div>
              <div className="modal-body p-4 pt-0">
                {isImporting && importProgress ? (
                  <div className="mt-2 text-center">
                    <h6 className="mb-3">A processar {importProgress.total} registos...</h6>
                    <div className="progress overflow-visible mb-2" style={{ height: '8px', borderRadius: '4px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                        role="progressbar"
                        style={{ width: `${importProgress.percentage}%`, borderRadius: '4px' }}
                      ></div>
                    </div>
                    <div className="text-center small text-muted fw-bold d-flex justify-content-between px-1">
                      <span>{importProgress.current} processados</span>
                      <span>{importProgress.percentage}%</span>
                    </div>
                  </div>
                ) : importResults ? (
                  <div className="py-2">
                    <div className="d-flex justify-content-center gap-5 mb-4 mt-2">
                      <div className="text-center">
                        <div className="h2 fw-bold text-success mb-0">{importResults.updated}</div>
                        <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>AtualizaçõeS</div>
                      </div>
                      <div className="text-center border-start ps-5">
                        <div className="h2 fw-bold text-warning mb-0">{importResults.notFound}</div>
                        <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Falhas (Não encont.)</div>
                      </div>
                    </div>
                    <div className="text-center mt-4">
                      <button className="btn btn-dark px-5 py-2 fw-bold" onClick={() => setImportResults(null)} style={{ borderRadius: '10px' }}>Concluir</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <Loader2 size={40} className="animate-spin text-primary mb-3 mx-auto" />
                    <p className="text-muted">A preparar ficheiro...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPage;
