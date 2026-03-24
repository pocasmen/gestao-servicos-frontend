import React, { useState, useEffect } from 'react';
import { Camera, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import apiClient from '../apiClient';
import { compressImage } from '../utils/imageUtils';
import logger from '../utils/logger';

interface ReportPhotosProps {
    reportId: number | null;
    onPhotosChange?: () => void;
}

interface Attachment {
    id: string;
    file_name: string;
    url: string;
}

const ReportPhotos: React.FC<ReportPhotosProps> = ({ reportId, onPhotosChange }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [compressionSettings, setCompressionSettings] = useState({ quality: 0.7, maxWidth: 1280 });

    useEffect(() => {
        fetchSettings();
        if (reportId) {
            fetchAttachments();
        }
    }, [reportId]);

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

    const fetchAttachments = async () => {
        if (!reportId) return;
        setIsLoading(true);
        try {
            const { data } = await apiClient.get(`/api/reports/${reportId}/attachments`);
            setAttachments(data);
        } catch (err) {
            logger.error(err, "Erro ao carregar anexos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !reportId) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                if (!file.type.startsWith('image/')) continue;

                const compressedBlob = await compressImage(file, {
                    quality: compressionSettings.quality,
                    maxWidth: compressionSettings.maxWidth,
                    type: 'image/jpeg'
                });

                const formData = new FormData();
                formData.append('file', compressedBlob, file.name.replace(/\.[^/.]+$/, "") + ".jpg");

                await apiClient.post(`/api/reports/${reportId}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            fetchAttachments();
            if (onPhotosChange) onPhotosChange();
        } catch (err) {
            logger.error(err, "Erro no upload das fotos");
            alert("Erro ao carregar as imagens.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem a certeza que deseja eliminar esta foto?")) return;
        try {
            await apiClient.delete(`/api/reports/attachments/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
            if (onPhotosChange) onPhotosChange();
        } catch (err) {
            logger.error(err, "Erro ao eliminar foto");
        }
    };

    if (!reportId) {
        return (
            <div className="alert alert-info py-2 small">
                Poderá anexar fotos após guardar o relatório pela primeira vez.
            </div>
        );
    }

    return (
        <div className="form-group mb-2 p-2 border rounded bg-light">
            <h6 className="form-label fw-bold mb-1 d-flex align-items-center small">
                <i className="bi bi-camera-fill me-2 text-primary"></i>
                Fotos de Evidência
            </h6>

            <div className="row g-2 mb-0">
                {attachments.map((att) => (
                    <div key={att.id} className="col-4 col-md-3">
                        <div className="card h-100 position-relative group shadow-sm border-0">
                            <img
                                src={att.url}
                                className="card-img-top object-fit-cover rounded"
                                alt={att.file_name}
                                style={{ height: '60px', cursor: 'pointer' }}
                                onClick={() => window.open(att.url, '_blank')}
                            />
                            <button
                                type="button"
                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-1 rounded-circle"
                                style={{ opacity: 0.9, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleDelete(att.id)}
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    </div>
                ))}

                <div className="col-4 col-md-3">
                    <label
                        className="card h-100 d-flex flex-column align-items-center justify-content-center border-dashed cursor-pointer bg-white shadow-sm"
                        style={{ height: '60px', border: '2px dashed #dee2e6', cursor: 'pointer' }}
                    >
                        {isUploading ? (
                            <Loader2 className="animate-spin text-primary" size={18} />
                        ) : (
                            <>
                                <Camera size={18} className="text-primary mb-0" />
                                <span className="small text-muted fw-bold" style={{ fontSize: '0.65rem' }}>Adicionar</span>
                            </>
                        )}
                        <input
                            type="file"
                            className="d-none"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default ReportPhotos;
