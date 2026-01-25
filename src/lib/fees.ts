// src/lib/fees.ts

export type PaymentMethod = "CREDIT_CARD" | "BOLETO" | "PIX";

export function calculateTotalWithFees(
    value: number,
    method: PaymentMethod,
    installments: number = 1
): number {
    // 1. TAXA DE SERVIÇO DA PLATAFORMA (Sua margem de 1%)
    const platformFeePercent = 0.01;
    const platformFee = value * platformFeePercent;

    let gatewayFee = 0;
    let fixedFee = 0;

    switch (method) {
        case "PIX":
            // Pix geralmente tem uma taxa fixa ou percentual baixo. 
            // Baseado no seu print, vamos usar a fixa de R$ 0,49 (ou ajuste conforme seu painel)
            fixedFee = 0.49;
            gatewayFee = 0; 
            break;

        case "BOLETO":
            // Taxa fixa de R$ 1,99 conforme solicitado
            fixedFee = 1.99;
            gatewayFee = 0;
            break;

        case "CREDIT_CARD":
            // Taxa fixa por transação
            fixedFee = 0.49;

            if (installments === 1) {
                // À vista: 2,99%
                gatewayFee = value * 0.0299;
            } else if (installments >= 2 && installments <= 6) {
                // 2x a 6x: 3,49%
                gatewayFee = value * 0.0349;
            } else if (installments >= 7 && installments <= 12) {
                // 7x a 12x: 3,99%
                gatewayFee = value * 0.0399;
            } else {
                // 13x a 21x: 4,29%
                gatewayFee = value * 0.0429;
            }
            break;
    }

    // O total é o valor original + sua margem + taxas do gateway
    const total = value + platformFee + gatewayFee + fixedFee;

    // Arredonda para 2 casas decimais
    return Math.round(total * 100) / 100;
}