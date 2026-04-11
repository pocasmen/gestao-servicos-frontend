import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning' | 'info';
    isAlert?: boolean;
    extraText?: string;
    onExtra?: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary',
    isAlert = false,
    extraText,
    onExtra,
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    // Handler para fechar ao clicar fora (opcional, pode ser perigoso para confirmações críticas)
    // Por enquanto, forçamos a escolha.

    // Mapear variantes para cores Bootstrap ou personalizadas se necessário
    // Usamos as classes padrão do bootstrap 'btn-args'

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1060, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn" style={{ width: '90%', maxWidth: '450px' }} role="dialog" aria-modal="true">
                <div className="px-4 pt-4 pb-2">
                    <h5 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.35rem', color: '#111827' }}>
                        {title}
                    </h5>
                </div>
                <div className="px-4 py-2" style={{ color: '#374151', fontSize: '1.05rem', lineHeight: '1.6' }}>
                    {typeof message === 'string' ? <p className="m-0">{message}</p> : message}
                </div>
                <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
                    {!isAlert && (
                        <button
                            className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    {extraText && (
                        <button
                            className="btn btn-outline-info rounded-pill px-4 fw-medium me-auto"
                            onClick={() => {
                                onExtra?.();
                                onCancel(); // Close the modal
                            }}
                        >
                            {extraText}
                        </button>
                    )}
                    <button
                        className={`btn btn-${variant} rounded-pill px-4 fw-bold shadow-sm`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
