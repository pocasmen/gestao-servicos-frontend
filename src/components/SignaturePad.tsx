import React, { useRef, useEffect, useState } from 'react';
import logger from '../utils/logger';
import './SignaturePad.css';
import { Maximize2, Minimize2, Trash2, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
    onConfirm: (signatureDataUrl: string) => void;
    onClear?: () => void;
    initialSignature?: string;
    title?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onConfirm, onClear, initialSignature, title = "Assinatura" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const hasBeenClearedRef = useRef(false);

    // Armazenar a imagem para redesenhar em caso de resize
    const imgCacheRef = useRef<HTMLImageElement | null>(null);
    const isLoadingImgRef = useRef(false);

    const [isEmpty, setIsEmpty] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Função para obter coordenadas lógicas (CSS pixels)
    const getCoordinates = (event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = (event as MouseEvent).clientX;
            clientY = (event as MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getCoordinates(event);
        isDrawingRef.current = true;
        lastPosRef.current = { x, y };

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (event: MouseEvent | TouchEvent) => {
        if (!isDrawingRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(event);

        ctx.lineTo(x, y);
        ctx.stroke();

        lastPosRef.current = { x, y };
        if (isEmpty) setIsEmpty(false);
        hasBeenClearedRef.current = true;

        if (event.cancelable) event.preventDefault();
    };

    const stopDrawing = () => {
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.closePath();
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Preencher com branco (necessário para JPEG)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.restore();
            setIsEmpty(true);
            hasBeenClearedRef.current = true;
            imgCacheRef.current = null;
            if (onClear) onClear();
        }
    };

    const handleConfirm = () => {
        if (isEmpty) return;
        const canvas = canvasRef.current;
        if (canvas) {
            // Usar JPEG com compressão (0.5 é excelente para assinaturas e muito leve)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            onConfirm(dataUrl);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // Desencadear resize global para recalcular o canvas
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 150);
    };

    // Efeito para configurar o canvas e lidar com a imagem inicial
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawStoredSignature = (currentCtx: CanvasRenderingContext2D, width: number, height: number) => {
            if (initialSignature && initialSignature.length > 10 && !hasBeenClearedRef.current) {
                if (imgCacheRef.current && imgCacheRef.current.complete) {
                    currentCtx.drawImage(imgCacheRef.current, 0, 0, width, height);
                    setIsEmpty(false);
                } else if (!isLoadingImgRef.current) {
                    isLoadingImgRef.current = true;
                    const img = new Image();
                    img.onload = () => {
                        imgCacheRef.current = img;
                        isLoadingImgRef.current = false;
                        // Redesenha apenas se ainda não foi substituído por desenho manual ou limpeza
                        if (!hasBeenClearedRef.current && canvasRef.current) {
                            const freshCtx = canvasRef.current.getContext('2d');
                            const freshRect = canvasRef.current.getBoundingClientRect();
                            if (freshCtx && freshRect.width > 0) {
                                freshCtx.drawImage(img, 0, 0, freshRect.width, freshRect.height);
                                setIsEmpty(false);
                            }
                        }
                    };
                    img.onerror = () => {
                        isLoadingImgRef.current = false;
                        logger.error("Erro ao carregar imagem da assinatura inicial");
                    };
                    img.src = initialSignature;
                }
            }
        };

        const setupCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            // Sempre garantir fundo branco (essencial para compatibilidade com JPEG)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (initialSignature && !hasBeenClearedRef.current) {
                drawStoredSignature(ctx, rect.width, rect.height);
            }
        };

        // Configuração inicial
        setupCanvas();

        const resizeObserver = new ResizeObserver(() => {
            setupCanvas();
        });
        resizeObserver.observe(canvas.parentElement || containerRef.current || document.body);

        const handleMouseMove = (e: MouseEvent) => draw(e);
        const handleTouchMove = (e: TouchEvent) => draw(e);
        const handleEnd = () => stopDrawing();

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [initialSignature]);

    // Resetar refs quando a assinatura de entrada muda drasticamente
    useEffect(() => {
        if (initialSignature && initialSignature.length > 10) {
            hasBeenClearedRef.current = false;
            imgCacheRef.current = null;
            setIsEmpty(false); // Pressupomos que não está vazio se há assinatura inicial válida
        } else {
            setIsEmpty(true);
        }
    }, [initialSignature]);

    return (
        <div className={`signature-pad-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
            <div className="signature-pad-header">
                <span>{title}</span>
                <div className="signature-pad-actions">
                    <button type="button" onClick={toggleFullscreen} className="btn-icon" title={isFullscreen ? "Recolher" : "Expandir"}>
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <button type="button" onClick={clearCanvas} className="btn-icon text-danger" title="Limpar">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onTouchStart={startDrawing}
                    className="signature-canvas"
                />
                {isEmpty && <div className="canvas-placeholder">Assine aqui</div>}
            </div>

            <div className="signature-pad-footer">
                <button
                    type="button"
                    className={`btn btn-confirm ${isEmpty ? 'disabled' : ''}`}
                    onClick={handleConfirm}
                    disabled={isEmpty}
                >
                    <CheckCircle size={18} className="me-2" />
                    Confirmar Assinatura
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
