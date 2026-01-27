
/**
 * Input Validation & Sanitization Module
 * 
 * Provides functions to:
 * 1. Sanitize text (trim, collapse spaces)
 * 2. Validate integrity (length, patterns, security)
 * 3. Heuristic checks (typos, anomalies)
 */

export interface ValidationOptions {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    blockScripts?: boolean; // Checks for <script>, javascript:, etc.
    type?: 'text' | 'email' | 'phone' | 'numeric' | 'alphanumeric';
}

export interface ValidationResult {
    isValid: boolean;
    sanitizedValue: string;
    errors: string[];
    warnings: string[]; // From heuristics
    confidenceScore: number; // 0-1, where 1 is perfect
    suggestion?: string; // Proposed correction
}

// Common typos map (Portuguese context based on project)
const COMMON_TYPOS: Record<string, string> = {
    'teh': 'the',
    'clinte': 'cliente',
    'agendamneto': 'agendamento',
    'tecnico': 'técnico',
    'avira': 'avaria',
    'concato': 'contato',
    'intervencao': 'intervenção',
    'manutencao': 'manutenção',
    'peca': 'peça',
    'servico': 'serviço',
    'nao': 'não',
    'estao': 'estão',
    'sao': 'são',
};

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/gim,
    /javascript:/gim,
    /onload\s*=/gim,
    /onerror\s*=/gim,
    /onclick\s*=/gim,
    /eval\(/gim,
];

/**
 * Step 1: Basic Sanitization
 * Removes leading/trailing whitespace and collapses multiple internal spaces.
 */
export const sanitizeInput = (text: string): string => {
    if (!text) return '';
    // Replace control characters (except newlines/tabs if needed, but requirements said "non-printable")
    // We keep \n and \t broadly, but collapse runs of whitespace.
    // The requirement says "Identificar e consolidar múltiplos espaços em branco... para um único espaço."
    // It assumes linear text. For textareas (multiline), we might want to preserve newlines?
    // Let's assume we preserve newlines but collapse horizontal spaces.

    // First, remove non-printable ASCII characters (0-31 except 9, 10, 13)
    // eslint-disable-next-line
    let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    clean = clean.trim();

    // Collapse multiple spaces/tabs into one space, but respect newlines if it's multiline content
    // If we assume single line fields: clean.replace(/\s+/g, ' ');
    // But for safety let's just collapse horizontal whitespace.
    clean = clean.replace(/[ \t]+/g, ' ');

    return clean;
};

/**
 * Step 2 & 3: Validation and Heuristics
 */
export const analyzeInput = (
    rawInput: string,
    options: ValidationOptions = {}
): ValidationResult => {
    const sanitized = sanitizeInput(rawInput);
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let suggestion = sanitized;

    // -- 2. Integrity Checks --

    // Length
    if (options.minLength && sanitized.length < options.minLength) {
        errors.push(`O texto é demasiado curto (mínimo ${options.minLength} caracteres).`);
        confidence -= 0.2;
    }
    if (options.maxLength && sanitized.length > options.maxLength) {
        errors.push(`O texto excede o limite (máximo ${options.maxLength} caracteres).`);
        confidence -= 0.2;
    }

    // Security / Malicious Patterns
    if (options.blockScripts !== false) { // Default to true
        for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(sanitized)) {
                errors.push('Conteúdo suspeito detetado (scripts ou códigos não permitidos).');
                confidence = 0; // Immediate fail
                break;
            }
        }
    }

    // Type specific
    if (options.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
            errors.push('Formato de email inválido.');
            confidence -= 0.5;
        }
    } else if (options.type === 'phone') {
        // Basic PT phone validation (9 digits, starts with 9 or 2) - customizable
        // allowing spaces, +, -
        const phoneClean = sanitized.replace(/[\s\-\+]/g, '');
        if (!/^\d+$/.test(phoneClean) || phoneClean.length < 9) {
            errors.push('Número de telefone parece inválido.');
            confidence -= 0.3;
        }
    } else if (options.type === 'numeric') {
        if (isNaN(Number(sanitized))) {
            errors.push('O valor deve ser numérico.');
            confidence -= 0.5;
        }
    }

    // Suspicious repetition (e.g., "aaaaaaaaaa")
    if (/(.)\1{4,}/.test(sanitized)) {
        warnings.push('Detetada repetição excessiva de caracteres.');
        confidence -= 0.1;
    }

    // -- 3. Heuristic Checks --

    // Check for common typos
    const words = sanitized.split(' ');
    const correctedWords = words.map(word => {
        const lower = word.toLowerCase().replace(/[.,;:!?]$/, ''); // strip punctuation for check
        if (COMMON_TYPOS[lower]) {
            // Preserve case if possible (simple heuristic: first letter)
            const replacement = COMMON_TYPOS[lower];
            if (/^[A-Z]/.test(word)) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
        }
        return word;
    });

    const correctedText = correctedWords.join(' ');
    if (correctedText !== sanitized) {
        warnings.push(`Possível erro de escrita. Sugestão: "${correctedText}"`);
        suggestion = correctedText;
        confidence -= 0.15; // penalize slightly for typos
    }

    // Heuristic: Numeric data in text field (if type is text but looks like a standalone number)
    if (options.type === 'text' && /^\d+$/.test(sanitized) && sanitized.length > 4) {
        warnings.push('Parece ter inserido apenas números num campo de texto. Confirme se é intencional.');
        confidence -= 0.1;
    }

    // Mixed casing anomaly (e.g. "cLiEnTe") - simple check: too many switches
    let switches = 0;
    for (let i = 0; i < sanitized.length - 1; i++) {
        const c1 = sanitized[i];
        const c2 = sanitized[i + 1];
        if (/[a-z]/.test(c1) && /[A-Z]/.test(c2)) switches++;
        if (/[A-Z]/.test(c1) && /[a-z]/.test(c2)) switches++; // Normal start of sentence doesn't count usually but inside word it does. 
        // This is too aggressive for normal text, let's refine:
        // Anomaly if lower follows upper inside word? No.
        // Anomaly: aAbB...
    }
    // Let's stick to simpler: if > 50% uppercase but not 100% (SHOUTING is okay-ish/rude, but mixed is weird)
    const upperCount = sanitized.replace(/[^A-Z]/g, '').length;
    const lowerCount = sanitized.replace(/[^a-z]/g, '').length;
    if (upperCount > 0 && lowerCount > 0 && upperCount > lowerCount * 2) {
        warnings.push('Uso excessivo de maiúsculas.');
        confidence -= 0.05;
    }


    return {
        isValid: errors.length === 0,
        sanitizedValue: sanitized,
        errors,
        warnings,
        confidenceScore: Math.max(0, confidence),
        suggestion: suggestion !== sanitized ? suggestion : undefined
    };
};
