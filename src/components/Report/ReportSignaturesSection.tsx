import React from 'react';
import SignaturePad from '../SignaturePad';

interface ReportSignaturesSectionProps {
    signature: string | undefined;
    setSignature: (val: string | undefined) => void;
}

const ReportSignaturesSection: React.FC<ReportSignaturesSectionProps> = ({
    signature,
    setSignature
}) => {
    return (
        <div className="form-group mt-4">
            <SignaturePad
                onConfirm={(dataUrl) => setSignature(dataUrl)}
                onClear={() => setSignature(undefined)}
                initialSignature={signature}
            />

            {signature && (
                <div className="alert alert-success mt-2 py-1 px-2 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Assinatura capturada com sucesso!
                </div>
            )}
        </div>
    );
};

export default ReportSignaturesSection;
