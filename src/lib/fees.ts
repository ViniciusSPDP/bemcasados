// src/lib/fees.ts

export type PaymentMethod = "CREDIT_CARD" | "BOLETO" | "PIX";

export function calculateTotalWithFees(
    value: number,
    method: PaymentMethod,
    installments: number = 1
): number {
    // 1. PERCENTUAL DA PLATAFORMA (Sua margem de 1%)
    const platformFeePercent = 0.01;

    // 2. TAXA DE MENSAGERIA/NOTIFICAÇÃO (Padrão Asaas: R$ 0,99)
    const messagingFee = 0;

    let gatewayPercentFee = 0;
    let gatewayFixedFee = 0;

    switch (method) {
        case "PIX":
            gatewayFixedFee = 1.99;
            gatewayPercentFee = 0; 
            break;

        case "BOLETO":
            gatewayFixedFee = 1.99;
            gatewayPercentFee = 0;
            break;

        case "CREDIT_CARD":
            gatewayFixedFee = 0.49;

            if (installments === 1) {
                gatewayPercentFee = 0.0299;
            } else if (installments >= 2 && installments <= 6) {
                gatewayPercentFee = 0.0349;
            } else if (installments >= 7 && installments <= 12) {
                gatewayPercentFee = 0.0399;
            } else {
                gatewayPercentFee = 0.0429;
            }
            break;
    }

    const totalPercentToDeduct = platformFeePercent + gatewayPercentFee;
    const totalFixedFees = gatewayFixedFee + messagingFee;

    // Cálculo base do Gross Up
    const totalRaw = (value + totalFixedFees) / (1 - totalPercentToDeduct);

    // --- LÓGICA DO NÚMERO BONITO (,90) ---
    // 1. Pegamos o valor inteiro (ex: 103)
    const integerPart = Math.floor(totalRaw);
    // 2. Sugerimos o valor terminando em ,90
    let beautifulNumber = integerPart + 0.90;

    // 3. Se o valor sugerido for menor que o mínimo necessário, 
    // subimos para o próximo real com final ,90
    if (beautifulNumber < totalRaw) {
        beautifulNumber += 1.00;
    }

    return Math.round(beautifulNumber * 100) / 100;
}