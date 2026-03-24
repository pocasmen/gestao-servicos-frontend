import logger from './logger';

export interface CompressionOptions {
    maxWidth?: number;
    quality?: number;
    type?: string;
}

export const compressImage = (file: File, options: CompressionOptions = {}): Promise<Blob> => {
    const { maxWidth = 1280, quality = 0.7, type } = options;
    const outputType = type || file.type;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // Ensure integer dimensions for canvas to avoid rendering issues
                width = Math.floor(width);
                height = Math.floor(height);
            
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context'));
                }

                // Fill background with white (important for transparent PNGs converting to JPEG)
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    outputType,
                    outputType === 'image/jpeg' ? quality : undefined
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Compresses a file if it is an image, otherwise returns the original file.
 * Returns a Promise that resolves to a File (or original File)
 */
export const compressIfImage = async (file: File, options: CompressionOptions = {}): Promise<File> => {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    try {
        const type = options.type || 'image/jpeg'; // Default to jpeg for technical photos
        const compressedBlob = await compressImage(file, { ...options, type });
        
        // Ensure extension matches the forced type
        let newName = file.name;
        if (type === 'image/jpeg' && !newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
            newName = newName.replace(/\.[^/.]+$/, "") + ".jpg";
        }

        return new File([compressedBlob], newName, { type });
    } catch (err) {
        logger.error(err, `Error compressing image ${file.name}, using original.`);
        return file;
    }
};

/**
 * Recorta e redimensiona uma assinatura para ocupar cerca de 90% do espaço disponível e ficar centrada.
 * Útil quando os clientes fazem assinaturas muito pequenas ou descentradas.
 */
export const processSignature = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/jpeg', 0.5);

    const width = canvas.width;
    const height = canvas.height;
    
    try {
        // Obter dados dos pixels para detetar a área desenhada
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        let minX = width, minY = height, maxX = 0, maxY = 0;
        let found = false;

        // O fundo é branco (#ffffff). Procuramos pixels que não sejam totalmente brancos.
        // Usamos um limiar (250) para ignorar variações subtis ou ruído.
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Se o pixel não for branco/quase-branco
                if (r < 250 || g < 250 || b < 250) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        // Se não houver nada desenhado, retorna o original
        if (!found) return canvas.toDataURL('image/jpeg', 0.5);

        // Adicionar uma pequena margem de segurança ao recorte (5 pixels)
        const paddingPixels = 5;
        minX = Math.max(0, minX - paddingPixels);
        minY = Math.max(0, minY - paddingPixels);
        maxX = Math.min(width - 1, maxX + paddingPixels);
        maxY = Math.min(height - 1, maxY + paddingPixels);

        const contentWidth = maxX - minX + 1;
        const contentHeight = maxY - minY + 1;

        // Criar um canvas temporário para o resultado final
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        if (!resultCtx) return canvas.toDataURL('image/jpeg', 0.5);

        // Preencher fundo com branco
        resultCtx.fillStyle = 'white';
        resultCtx.fillRect(0, 0, width, height);

        // Calcular escala para ocupar 90% da área (seja em largura ou altura)
        const targetRatio = 0.9;
        const maxTargetWidth = width * targetRatio;
        const maxTargetHeight = height * targetRatio;
        
        const scaleX = maxTargetWidth / contentWidth;
        const scaleY = maxTargetHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY);

        // Se a assinatura já for grande o suficiente, podemos não querer aumentar muito (evitar pixelização extrema)
        // No entanto, o pedido foi para maximizar, por isso aplicamos a escala calculada.
        
        const finalWidth = contentWidth * scale;
        const finalHeight = contentHeight * scale;
        
        // Calcular posição para centrar
        const offsetX = (width - finalWidth) / 2;
        const offsetY = (height - finalHeight) / 2;

        // Desenhar a parte recortada no novo canvas com escala e centro
        resultCtx.drawImage(
            canvas,
            minX, minY, contentWidth, contentHeight, // Origem
            offsetX, offsetY, finalWidth, finalHeight // Destino
        );

        return resultCanvas.toDataURL('image/jpeg', 0.5);
    } catch (error) {
        logger.error(error, "Erro ao processar assinatura:");
        return canvas.toDataURL('image/jpeg', 0.5);
    }
};

