import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Download, X, Calendar, User, Hash, Euro } from 'lucide-react';
import apiClient from '../apiClient';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface InvoiceItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_nif: string;
  issue_date: string;
  due_date?: string;
  vendor?: string;
  reference?: string;
  incidence: number;
  vat_total: number;
  total_value: number;
  file_url: string;
  created_at: string;
  items?: InvoiceItem[];
}

const InvoiceDocsPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/invoices');
      setInvoices(response.data);
    } catch (err) {
      console.error('Erro ao procurar faturas:', err);
      setError('Não foi possível carregar a lista de faturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post('/api/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      // Reset input
      const input = document.getElementById('invoice-upload') as HTMLInputElement;
      if (input) input.value = '';

      await fetchInvoices();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erro de rede ou servidor.';
      setError(`Falha ao carregar: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/D';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return 'Inválida';
    }
  };

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
        <div className="d-flex align-items-center gap-3">
          <FileText size={40} strokeWidth={2.5} className="text-primary" />
          <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)' }}>Gestão de Documentos</h1>
        </div>
          <p className="text-muted small m-0 fst-italic">Extração automatizada de dados de faturas internos.</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Upload Section */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-primary text-white p-3 border-0">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Upload size={18} /> Novo Carregamento
              </h5>
            </div>
            <div className="card-body p-4 text-center">
              <form onSubmit={handleUpload}>
                <div className="mb-4">
                  <div className="upload-zone p-4 border-2 border-dashed rounded-4 bg-light cursor-pointer hover-bg-light-blue"
                    onClick={() => document.getElementById('invoice-upload')?.click()}>
                    <Upload size={40} className="text-primary opacity-50 mb-2" />
                    <p className="mb-0 small text-muted">Arraste ou clique para selecionar<br />PDF da fatura (Micro Atomo)</p>
                  </div>
                  <input
                    type="file"
                    id="invoice-upload"
                    className="d-none"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </div>

                {file && (
                  <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2 text-start">
                    <FileText size={16} />
                    <span className="small truncate-text flex-grow-1">{file.name}</span>
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2 text-start">
                    <AlertCircle size={16} />
                    <span className="small">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 rounded-pill py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      Processar Documento <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-dark text-white p-3">
              <h5 className="mb-0">Faturas Carregadas</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light border-bottom border-light">
                    <tr>
                      <th className="px-4 py-3 text-muted small fw-bold text-uppercase">Nº Fatura / Data</th>
                      <th className="py-3 text-muted small fw-bold text-uppercase">Cliente / NIF</th>
                      <th className="py-3 text-muted small fw-bold text-uppercase text-end">Total</th>
                      <th className="px-4 py-3 text-muted small fw-bold text-uppercase text-center">Ficheiro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-5">
                          <Loader2 size={32} className="animate-spin text-primary mb-2" />
                          <p className="text-muted mb-0">A carregar documentos...</p>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-5">
                          <p className="text-muted mb-0">Nenhum documento carregado.</p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="align-middle"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <td className="px-4">
                            <div className="fw-bold text-dark">{invoice.invoice_number}</div>
                            <div className="text-muted small">
                              {invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pt }) : 'N/D'}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark truncate-text" style={{ maxWidth: '200px' }}>
                              {invoice.customer_name}
                            </div>
                            <div className="text-muted small">NIF: {invoice.customer_nif}</div>
                          </td>
                          <td className="text-end fw-bold text-primary">
                            {formatCurrency(invoice.total_value)}
                          </td>
                          <td className="px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <a href={invoice.file_url} target="_blank" rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-secondary rounded-circle p-1 hover-bg-primary hover-text-white transition-all">
                              <Download size={16} />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedInvoice && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden animate__animated animate__zoomIn animate__faster">
              <div className="modal-header bg-primary text-white p-3 border-0">
                <h5 className="modal-title d-flex align-items-center gap-2 mb-0">
                  <FileText size={20} />
                  Fatura: {selectedInvoice.invoice_number}
                </h5>
                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setSelectedInvoice(null)}></button>
              </div>

              <div className="modal-body p-0">
                {/* Header Info */}
                <div className="bg-light p-4 border-bottom">
                  <div className="row g-3">
                    <div className="col-md-7">
                      <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                        <User size={14} /> CLIENTE
                      </div>
                      <h5 className="fw-bold mb-0 text-dark">{selectedInvoice.customer_name}</h5>
                      <div className="text-muted small">NIF: {selectedInvoice.customer_nif}</div>
                    </div>
                    <div className="col-md-5 text-md-end">
                      <div className="d-flex align-items-center justify-content-md-end gap-2 text-muted small mb-1">
                        <Calendar size={14} /> DATAS
                      </div>
                      <div className="text-dark small"><b>Emissão:</b> {formatDate(selectedInvoice.issue_date)}</div>
                      <div className="text-dark small"><b>Vencimento:</b> {formatDate(selectedInvoice.due_date)}</div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="p-4 border-bottom bg-white">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="text-muted small mb-1">REFERÊNCIA</div>
                      <div className="fw-semibold text-dark">{selectedInvoice.reference || '-'}</div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-muted small mb-1">VENDEDOR</div>
                      <div className="fw-semibold text-dark">{selectedInvoice.vendor || 'N/A'}</div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-muted small mb-1">CRIADO EM</div>
                      <div className="fw-semibold text-dark">{format(new Date(selectedInvoice.created_at), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="p-0">
                  <div className="table-responsive" style={{ maxHeight: '300px' }}>
                    <table className="table table-sm table-striped mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th className="px-4 py-2 border-0">Código / Designação</th>
                          <th className="text-end py-2 border-0">Qtd</th>
                          <th className="text-end py-2 border-0">Preço Un.</th>
                          <th className="text-end px-4 py-2 border-0">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items?.map((item, idx) => (
                          <tr key={idx} className="small align-middle">
                            <td className="px-4 py-2">
                              <div className="fw-semibold">{item.description}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{item.code}</div>
                            </td>
                            <td className="text-end py-2">{item.quantity}</td>
                            <td className="text-end py-2">{formatCurrency(item.unit_price)}</td>
                            <td className="text-end px-4 py-2 fw-bold">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-light p-4">
                  <div className="row justify-content-end">
                    <div className="col-md-5">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Incidência (Base):</span>
                        <span className="fw-semibold">{formatCurrency(selectedInvoice.incidence)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Total IVA:</span>
                        <span className="fw-semibold text-danger">{formatCurrency(selectedInvoice.vat_total)}</span>
                      </div>
                      <div className="d-flex justify-content-between border-top pt-2 mt-2 align-items-center">
                        <span className="fw-bold text-dark">TOTAL FINAL:</span>
                        <span className="h4 fw-bold text-primary mb-0">{formatCurrency(selectedInvoice.total_value)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-white p-3 border-top d-flex justify-content-between">
                <a href={selectedInvoice.file_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-4">
                  <Download size={18} /> Baixar PDF Original
                </a>
                <button type="button" className="btn btn-dark rounded-pill px-4" onClick={() => setSelectedInvoice(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .upload-zone:hover {
          border-color: var(--bs-primary) !important;
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hover-bg-primary:hover {
          background-color: #0d6efd !important;
          color: white !important;
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate__zoomIn {
          --animate-duration: 0.3s;
        }
      `}</style>
    </div>
  );
};

export default InvoiceDocsPage;
