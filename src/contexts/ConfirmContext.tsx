import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export interface ConfirmOptions {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning' | 'info';
    isAlert?: boolean; // Se true, mostra apenas botão OK
    extraText?: string;
    onExtra?: () => void;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType>({
    confirm: async () => false,
    alert: async () => { },
});

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const defaultOptions: ConfirmOptions = {
            title: 'Confirmação',
            message: '',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            variant: 'primary',
            isAlert: false,
        };

        let finalOptions = defaultOptions;

        if (typeof opts === 'string') {
            finalOptions = { ...defaultOptions, message: opts };
        } else {
            finalOptions = { ...defaultOptions, ...opts };
        }

        setOptions(finalOptions);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const alert = useCallback((message: string, title: string = 'Aviso') => {
        return confirm({
            message,
            title,
            confirmText: 'OK',
            variant: 'primary', // Ou info
            isAlert: true
        }).then(() => { });
    }, [confirm]);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {options && (
                <ConfirmModal
                    isOpen={isOpen}
                    title={options.title}
                    message={options.message}
                    confirmText={options.confirmText}
                    cancelText={options.cancelText}
                    variant={options.variant}
                    isAlert={options.isAlert}
                    extraText={options.extraText}
                    onExtra={options.onExtra}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
};
