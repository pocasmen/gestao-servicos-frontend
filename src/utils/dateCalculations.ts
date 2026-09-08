// Função para calcular horas trabalhadas com desconto de almoço e arredondamento para cima
export const calculateHours = (start: Date, end: Date): number => {
    let diffMs = end.getTime() - start.getTime(); // Diferença em milissegundos
    let diffHours = diffMs / (1000 * 60 * 60); // Diferença em horas

    // Verificar se o intervalo de almoço (13h-14h) está dentro do período do serviço
    const lunchStart = new Date(start);
    lunchStart.setHours(13, 0, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setHours(14, 0, 0, 0);

    // Se o serviço começa antes ou durante o almoço e termina depois ou durante o almoço
    if (start < lunchEnd && end > lunchStart) {
        // Calcular a sobreposição do almoço
        const overlapStart = Math.max(start.getTime(), lunchStart.getTime());
        const overlapEnd = Math.min(end.getTime(), lunchEnd.getTime());
        if (overlapEnd > overlapStart) {
            const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
            diffHours -= overlapHours; // Subtrai apenas a sobreposição
        }
    }

    // Arredondar para cima para o número inteiro mais próximo
    return Math.max(0, Math.ceil(diffHours)); // Garantir que não é negativo
};
