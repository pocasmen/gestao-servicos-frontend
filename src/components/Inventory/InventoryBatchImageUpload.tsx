import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { compressImage, compressIfImage } from '../../utils/imageUtils';
import apiClient from '../../apiClient';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../../utils/logger';

interface InventoryBatchImageUploadProps {
    isOpen: boolean;
    onClose: () => void;
}

const InventoryBatchImageUpload: React.FC<InventoryBatchImageUploadProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [results, setResults] = useState<{ success: number; failed: number; errors: any[] } | null>(null);
    const [compressionSettings, setCompressionSettings] = useState({ quality: 0.7, maxWidth: 1280 });

    React.useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        try {
            const { data } = await apiClient.get('/api/settings');
            setCompressionSettings({
                quality: parseFloat(data.img_compression_quality || '0.7'),
                maxWidth: parseInt(data.img_compression_max_width || '1280')
            });
        } catch (err) {
            logger.error(err, "Erro ao carregar definições de compressão");
        }
    };

    if (!isOpen) return null;

    const resetState = () => {
        setFiles([]);
        setIsUploading(false);
        setUploadProgress(0);
        setResults(null);
    };

    const handleClose = () => {
        if (!isUploading) {
            resetState();
            onClose();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setResults(null);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0 || isUploading) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const chunkSize = 5; // Smaller chunks for server bandwidth/limit safety
            let successTotal = 0;
            let failedTotal = 0;
            const allErrors: any[] = [];

            for (let i = 0; i < files.length; i += chunkSize) {
                const chunk = files.slice(i, i + chunkSize);
                const formData = new FormData();

                // Compress images before sending
                await Promise.all(chunk.map(async (file) => {
                    try {
                        const compressedFile = await compressIfImage(file, { 
                            maxWidth: compressionSettings.maxWidth, 
                            quality: compressionSettings.quality,
                            type: 'image/jpeg'
                        });

                        formData.append('files', compressedFile);
                    } catch (err) {
                        logger.error(err, `Error compressing image ${file.name}`);
                        allErrors.push({ file: file.name, error: 'Erro ao processar imagem localmente.' });
                    }
                }));

                try {
                    const response = await apiClient.post('/api/inventory/batch-images', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    
                    const chunkResult = response.data;
                    successTotal += chunkResult.success;
                    failedTotal += chunkResult.failed;
                    allErrors.push(...(chunkResult.errors || []));
                } catch (err: any) {
                    logger.error(err, 'Error uploading chunk:');
                    failedTotal += chunk.length;
                    allErrors.push(...chunk.map(f => ({ file: f.name, error: 'Erro na ligação ao servidor.' })));
                }

                setUploadProgress(Math.round(((i + chunk.length) / files.length) * 100));
            }

            setResults({ success: successTotal, failed: failedTotal, errors: allErrors });
            queryClient.invalidateQueries({ queryKey: ['admin_inventory_all'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        } catch (err) {
            logger.error(err, 'Critical error in batch upload:');
        } finally {
            setIsUploading(false);
            setFiles([]);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isUploading) {
            onClose();
        }
    };

    return (
        <div 
            className="modal show d-block" 
            tabIndex={-1} 
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
            onClick={handleBackdropClick}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }}>
                    <div className="modal-header border-bottom-0 p-4 pb-2">
                        <h5 className="modal-title fw-bold">Importar Fotos em Lote</h5>
                        {!isUploading && (
                            <button type="button" className="btn-close" onClick={handleClose}></button>
                        )}
                    </div>
                    
                    <div className="modal-body p-4 pt-0">
                        {!results ? (
                            <>
                                <p className="text-muted small mb-4">
                                    Seleciona múltiplas imagens (JPG ou PNG). O nome de cada ficheiro deve ser a referência da peça (ex: <code>REF-123.png</code>).
                                </p>
                                
                                <div 
                                    className="upload-dropzone p-5 text-center border-2 border-dashed rounded-4 mb-4 position-relative"
                                    style={{ borderColor: '#dee2e6', backgroundColor: '#f8f9fa' }}
                                >
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/jpeg,image/jpg,image/png" 
                                        className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer" 
                                        id="batch-image-input" 
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                    <div className="py-2">
                                        <div className="mb-3">
                                            <Upload size={48} className="text-primary mx-auto opacity-75" />
                                        </div>
                                        <h6 className="fw-bold mb-1">Clica ou arrasta as fotos para aqui</h6>
                                        <p className="text-muted small mb-0">Até 500 ficheiros de cada vez</p>
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
                                                {files.length} ficheiros selecionados
                                            </span>
                                            {!isUploading && (
                                                <button 
                                                    className="btn btn-link btn-sm text-danger text-decoration-none" 
                                                    onClick={() => setFiles([])}
                                                >
                                                    Limpar
                                                </button>
                                            )}
                                        </div>
                                        
                                        {isUploading && (
                                            <div className="mt-3">
                                                <div className="progress overflow-visible mb-2" style={{ height: '8px', borderRadius: '4px' }}>
                                                    <div 
                                                        className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                                                        role="progressbar" 
                                                        style={{ width: `${uploadProgress}%`, borderRadius: '4px' }}
                                                    ></div>
                                                </div>
                                                <div className="text-center small text-muted fw-bold">{uploadProgress}% Concluído</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-2">
                                <div className="d-flex justify-content-center gap-5 mb-5 mt-3">
                                    <div className="text-center">
                                        <div className="h2 fw-bold text-success mb-0">{results.success}</div>
                                        <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Sucesso</div>
                                    </div>
                                    <div className="text-center border-start ps-5">
                                        <div className="h2 fw-bold text-danger mb-0">{results.failed}</div>
                                        <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Com Erro</div>
                                    </div>
                                </div>

                                {results.errors.length > 0 && (
                                    <div className="border-0 bg-light rounded-4 p-4 shadow-inner" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <h6 className="fw-bold small text-uppercase text-secondary mb-3 d-flex align-items-center gap-2">
                                            <AlertCircle size={16} /> Detalhes dos Problemas:
                                        </h6>
                                        <div className="d-flex flex-column gap-2">
                                            {results.errors.map((err, idx) => (
                                                <div key={idx} className="small bg-white p-2 px-3 rounded-3 border-start border-danger border-4 shadow-sm">
                                                    <span className="fw-bold text-dark">{err.file}</span>: <span className="text-danger">{err.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-top-0 p-4 pt-0 mt-2">
                        {!results ? (
                            <>
                                <button className="btn btn-light px-4 py-2" onClick={handleClose} disabled={isUploading}>Cancelar</button>
                                <button 
                                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 fw-bold" 
                                    onClick={handleUpload}
                                    disabled={files.length === 0 || isUploading}
                                >
                                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    {isUploading ? 'A Processar...' : 'Começar Importação'}
                                </button>
                            </>
                        ) : (
                            <div className="d-flex gap-2 w-100 justify-content-center">
                                <button className="btn btn-light px-4 py-2" onClick={resetState}>Nova Importação</button>
                                <button className="btn btn-dark px-5 py-2 fw-bold" onClick={handleClose} style={{ borderRadius: '10px' }}>Concluir</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryBatchImageUpload;
