import React, { useState, useEffect } from 'react';
import SignaturePad from '../SignaturePad';

interface ReportSignaturesSectionProps {
    signature: string | undefined;
    setSignature: (val: string | undefined) => void;
    clientSignerName: string;
    setClientSignerName: (val: string) => void;
    clientUsers: { id: string; first_name: string; last_name: string; email?: string }[];
}

const ReportSignaturesSection: React.FC<ReportSignaturesSectionProps> = ({
    signature,
    setSignature,
    clientSignerName,
    setClientSignerName,
    clientUsers
}) => {
    const [isOther, setIsOther] = useState(false);

    useEffect(() => {
        // If no client users, force "Other" mode
        if (clientUsers && clientUsers.length === 0) {
            setIsOther(true);
        }
    }, [clientUsers]);

    useEffect(() => {
        // Decide if chosen name is one of the dropdown's users or "Other"
        if (clientSignerName) {
            const exists = clientUsers.some(u => `${u.first_name} ${u.last_name}`.trim() === clientSignerName);
            if (!exists && clientSignerName !== '') {
                setIsOther(true);
            } else {
                setIsOther(false);
            }
        }
    }, [clientSignerName, clientUsers]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'outro') {
            setIsOther(true);
            setClientSignerName('');
        } else {
            setIsOther(false);
            setClientSignerName(val);
        }
    };

    return (
        <div className="form-group mt-2 p-2 border rounded bg-light">
            <label className="form-label fw-bold mb-1 d-flex align-items-center small">
                <i className="bi bi-person-fill me-2 text-primary"></i>
                Quem assina pelo Cliente?
            </label>

            <div className="row g-2 mb-2">
                {clientUsers.length > 0 && (
                    <div className={isOther ? "col-md-5" : "col-12"}>
                        <select
                            className="form-select form-select-sm"
                            value={isOther ? 'outro' : clientSignerName}
                            onChange={handleSelectChange}
                        >
                            <option value="">Selecione quem vai assinar...</option>
                            {clientUsers.map(user => {
                                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Utilizador sem nome';
                                return (
                                    <option key={user.id} value={fullName}>
                                        {fullName}
                                    </option>
                                );
                            })}
                            <option value="outro">Outro...</option>
                        </select>
                    </div>
                )}

                {isOther && (
                    <div className={clientUsers.length > 0 ? "col-md-7" : "col-12"}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Nome (Primeiro e Último)"
                            value={clientSignerName}
                            onChange={(e) => setClientSignerName(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <SignaturePad
                onConfirm={(dataUrl) => setSignature(dataUrl)}
                onClear={() => setSignature(undefined)}
                initialSignature={signature}
            />

            {signature && (
                <div className="alert alert-success mt-1 py-1 px-2 d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Assinatura capturada com sucesso!
                </div>
            )}

            {clientSignerName && (
                <div className="mt-1 text-muted italic" style={{ fontSize: '0.75rem' }}>
                    Assinado por: <strong>{clientSignerName}</strong>
                </div>
            )}
        </div>
    );
};

export default ReportSignaturesSection;

