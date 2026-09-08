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

export interface ConfirmChoiceOptions {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    extraText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning' | 'info';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    confirmChoice: (options: ConfirmChoiceOptions) => Promise<'confirm' | 'extra' | 'cancel'>;
    alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType>({
    confirm: async () => false,
    confirmChoice: async () => 'cancel',
    alert: async () => { },
});

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const resolveRef = useRef<(value: boolean) => void>(() => { });
    const choiceResolveRef = useRef<((value: 'confirm' | 'extra' | 'cancel') => void) | null>(null);

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
        choiceResolveRef.current = null;

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const confirmChoice = useCallback((opts: ConfirmChoiceOptions) => {
        setOptions({
            title: opts.title || 'Confirmação',
            message: opts.message,
            confirmText: opts.confirmText || 'Sim',
            extraText: opts.extraText || 'Não',
            cancelText: opts.cancelText || 'Cancelar',
            variant: opts.variant || 'primary',
            isAlert: false,
        });
        setIsOpen(true);

        return new Promise<'confirm' | 'extra' | 'cancel'>((resolve) => {
            choiceResolveRef.current = resolve;
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
        if (choiceResolveRef.current) {
            choiceResolveRef.current('confirm');
            choiceResolveRef.current = null;
        } else {
            resolveRef.current(true);
        }
    };

    const handleExtra = () => {
        setIsOpen(false);
        if (choiceResolveRef.current) {
            choiceResolveRef.current('extra');
            choiceResolveRef.current = null;
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (choiceResolveRef.current) {
            choiceResolveRef.current('cancel');
            choiceResolveRef.current = null;
        } else {
            resolveRef.current(false);
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, confirmChoice, alert }}>
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
                    onExtra={options.onExtra || handleExtra}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
};
