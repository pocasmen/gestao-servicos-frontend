import React from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning' | 'info';
    isAlert?: boolean;
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
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    // Handler para fechar ao clicar fora (opcional, pode ser perigoso para confirmações críticas)
    // Por enquanto, forçamos a escolha.

    // Mapear variantes para cores Bootstrap ou personalizadas se necessário
    // Usamos as classes padrão do bootstrap 'btn-args'

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} role="dialog" aria-modal="true">
                <div className={styles.header}>
                    <h5 className={styles.title}>{title}</h5>
                </div>
                <div className={styles.body}>
                    {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
                </div>
                <div className={styles.footer}>
                    {!isAlert && (
                        <button
                            className={`btn btn-light text-dark border-0 ${styles.button}`}
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        className={`btn btn-${variant} ${styles.button}`}
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
