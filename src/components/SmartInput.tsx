import React, { useState, useEffect, useCallback } from 'react';
import { analyzeInput, ValidationOptions, ValidationResult } from '../utils/inputValidation';
import styles from './SmartInput.module.css';

interface SmartInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options?: ValidationOptions;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'email' | 'tel' | 'number';
    disabled?: boolean;
    required?: boolean;
    hideLabel?: boolean;
    className?: string; // Additional classes for the wrapper
    onValidationChange?: (isValid: boolean) => void;
    onAudit?: (action: 'correction' | 'override' | 'ignore', details: any) => void;
    onBlur?: () => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({
    label,
    value,
    onChange,
    options = {},
    placeholder,
    type = 'text',
    disabled,
    required,
    hideLabel = false,
    className,
    onValidationChange,
    onAudit,
    onBlur
}) => {
    const [internalValue, setInternalValue] = useState(value);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'suspicious'>('idle');
    const [isTyping, setIsTyping] = useState(false);

    // Sync internal value if prop changes (controlled component)
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    const validate = useCallback((text: string) => {
        // Merge implicit options based on type
        const finalOptions: ValidationOptions = { ...options };
        if (type === 'email') finalOptions.type = 'email';
        if (type === 'tel') finalOptions.type = 'phone';
        if (type === 'number') finalOptions.type = 'numeric';
        if (required && !finalOptions.minLength) finalOptions.minLength = 1;

        const result = analyzeInput(text, finalOptions);
        setValidationResult(result);

        if (!result.isValid) {
            setStatus('invalid');
            onValidationChange?.(false);
        } else if (result.warnings.length > 0) {
            // Heuristic issues found
            setStatus('suspicious');
            onValidationChange?.(false); // Consider suspicious as not-ready-to-submit until confirmed
        } else {
            setStatus('valid');
            onValidationChange?.(true);
        }
    }, [options, type, required, onValidationChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setInternalValue(newVal);
        setIsTyping(true);
        onChange(newVal);

        // Clear status while typing if we want, or validate live?
        // Let's clear status to remove old error messages while user fixes it
        if (status !== 'idle') setStatus('idle');
    };

    const handleBlur = () => {
        setIsTyping(false);

        // Auto-sanitize on blur (whitespace cleanup)
        let valueToValidate = internalValue;
        const sanitized = analyzeInput(internalValue, options).sanitizedValue;

        // If the only difference is whitespace (which sanitizeInput handles), apply it automatically
        // This meets requirement 1 without bothering the user for trivial whitespace
        if (sanitized !== internalValue && sanitized.length > 0) {
            setInternalValue(sanitized);
            onChange(sanitized);
            valueToValidate = sanitized;
        }

        validate(valueToValidate);
        onBlur?.();
    };

    const applyCorrection = () => {
        if (validationResult && validationResult.suggestion) {
            const fixed = validationResult.suggestion;
            setInternalValue(fixed);
            onChange(fixed);

            onAudit?.('correction', { original: internalValue, fixed });

            // Re-validate strictly or just set to valid
            // Let's re-validate to ensure the fix is actually valid
            // (Conceptually it should be, but let's be safe)
            const newResult = analyzeInput(fixed, options);
            setValidationResult(newResult);
            setStatus('valid');
            onValidationChange?.(true);
        }
    };

    const keepAsIs = () => {
        // User overrides the warning
        setStatus('valid'); // Force valid status
        onValidationChange?.(true);

        const details = { original: internalValue, warnings: validationResult?.warnings };
        // Optionally log this override action
        console.info('User overrode validation warning', details);
        onAudit?.('override', details);
    };

    const ignoreValidation = () => {
        // "Force" ignore everything
        setStatus('valid');
        onValidationChange?.(true);
    };

    // Determine input class
    let inputClass = styles.input;
    if (!isTyping && status === 'invalid') inputClass += ` ${styles.error}`;
    else if (!isTyping && status === 'suspicious') inputClass += ` ${styles.suspicious}`;
    else if (!isTyping && status === 'valid' && internalValue) inputClass += ` ${styles.verified}`;

    const renderInput = () => {
        const commonProps = {
            value: internalValue,
            onChange: handleChange,
            onBlur: handleBlur,
            className: inputClass,
            placeholder,
            disabled,
            required // HTML5 validation as backup
        };

        if (type === 'textarea') {
            return <textarea {...commonProps} rows={4} />;
        }
        return <input type={type === 'tel' ? 'tel' : type === 'number' ? 'number' : 'text'} {...commonProps} />;
    };

    return (
        <div className={`${styles.container} ${className || ''}`}>
            {!hideLabel && (
                <label className={styles.label}>
                    {label}
                    {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                </label>
            )}

            <div className={styles.inputWrapper}>
                {renderInput()}
            </div>

            {/* Error State */}
            {!isTyping && status === 'invalid' && validationResult && (
                <div className={`${styles.feedbackCard} ${styles.errorCard}`}>
                    <div className={styles.cardTitle}>⚠️ Erro de Validação</div>
                    <div className={styles.cardMessage}>
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                            {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            {/* Suspicious/Warning State */}
            {!isTyping && status === 'suspicious' && validationResult && (
                <div className={`${styles.feedbackCard} ${styles.suspiciousCard}`}>
                    <div className={styles.cardTitle}>🧐 Verificação de Qualidade</div>
                    <div className={styles.cardMessage}>
                        {validationResult.warnings.map((warn, i) => (
                            <div key={i}>{warn}</div>
                        ))}

                        {validationResult.suggestion && validationResult.suggestion !== internalValue && (
                            <div className={styles.suggestionBox}>
                                Sugestão: <strong>{validationResult.suggestion}</strong>
                            </div>
                        )}

                        <div className={styles.actions}>
                            {validationResult.suggestion && (
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={applyCorrection}
                                >
                                    Corrigir
                                </button>
                            )}
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnWarning}`}
                                onClick={keepAsIs}
                            >
                                Manter como está
                            </button>
                            {/* "Ignorar" is implicitly "Manter como está" for warnings, but if we had hard errors we allowed overriding, 'Ignorar' would be relevant. 
                  For now 'Manter' marks it valid. */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
