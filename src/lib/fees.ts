
export type PaymentMethod = "CREDIT_CARD" | "BOLETO" | "PIX";

export const FEES = {
    PIX: { percent: 0, fixed: 1.99 },
    BOLETO: { percent: 0, fixed: 0.99 },
    CREDIT_CARD: {
        fixed: 0.49,
        brackets: [
            { max: 1, percent: 0.0199 },   // 1x: 1.99%
            { max: 6, percent: 0.0249 },   // 2x a 6x: 2.49%
            { max: 12, percent: 0.0299 },  // 7x a 12x: 2.99%
            { max: 21, percent: 0.0329 },  // 13x a 21x: 3.29%
        ]
    }
};

export function calculateTotalWithFees(
    originalValue: number,
    method: PaymentMethod,
    installments: number = 1
): number{
    let percent = 0;
    let fixed = 0;

    if (method === "CREDIT_CARD") {
        const config = FEES.CREDIT_CARD;
        const bracket = config.brackets.find(b => installments <= b.max) || config.brackets[config.brackets.length - 1];
        percent = bracket.percent;
        
        // No cartão, a tarifa fixa é geralmente cobrada uma vez sobre a transação
        fixed = config.fixed; 
    } else {
        const config = FEES[method];
        percent = config.percent;
        
        // No Boleto, a taxa é por compensação. Se parcelar em 3x, são 3 taxas.
        fixed = config.fixed * installments;
    }
    const total = (originalValue + fixed) / (1 - percent);

    return Math.round(total * 100) / 100;
}