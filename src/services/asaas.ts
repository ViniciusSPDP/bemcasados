//src/services/asaas.ts
import axios from "axios";

export type PaymentMethod = "CREDIT_CARD" | "BOLETO" | "PIX";

interface CustomerData {
  name: string;
  cpfCnpj: string;
  email: string;
}

interface CreateChargeParams {
  customer: CustomerData;
  value: number;
  method: PaymentMethod;
  description: string;
  externalReference: string;
}


const api = axios.create({
  baseURL: process.env.ASAAS_URL,
  headers: {
    access_token: process.env.ASAAS_API_KEY,
    "Content-Type": "application/json",
  },
});

//Calculo de taxas para garantir o valor liquido desejado
export function calculateTotalWithFees(
  originalValue: number,
  method: PaymentMethod
): number {
  const fees = {
    PIX: { percent: 0, fixed: 1.99 },
    BOLETO: { percent: 0, fixed: 2.49 },
    CREDIT_CARD: { percent: 0.0299, fixed: 0.49 },
  };

  const fee = fees[method];

  // Fórmula: ValorFinal = (ValorOriginal + CustoFixo) / (1 - %Taxa)
  // Exemplo: Quero receber R$ 100,00 no Cartão (2.99% + 0.49)
  // (100 + 0.49) / (1 - 0.0299) = 100.49 / 0.9701 = R$ 103,58
  const total = (originalValue + fee.fixed) / (1 - fee.percent);

  return Math.round(total * 100) / 100; // Arredonda para 2 casas decimais
}

//Cria o cliente se não existir
async function getOrCreateCustomer(data: CustomerData) {
  const cleanCpfCnpj = data.cpfCnpj.replace(/\D/g, "");

  try {
    //Buca cliente pelo CPF/CNPJ
    const { data: search } = await api.get(
      `/customers?cpfCnpj=${cleanCpfCnpj}`
    );
    if (search.data && search.data.length > 0) {
      return search.data[0].id; //Retorna o ID do cliente existente
    }

    //Cria um novo cliente
    const { data: newCustomer } = await api.post("/customers", {
      name: data.name,
      cpfCnpj: cleanCpfCnpj,
      email: data.email,
    });
    return newCustomer.id;
  } catch (error) {
    console.error("Erro ao criar cliente no ASAAS:", error);
    throw new Error("Erro ao criar cliente no gateway de pagamento.");
  }
}

//Cria a cobrança no Asaas
export async function createAsaasCharge({
  customer,
  value,
  method,
  description,
  externalReference,
}: CreateChargeParams) {
  //Calcula o valor total com taxas
  const finalValue = calculateTotalWithFees(value, method);
  const calculatedFee = finalValue - value;

  //Obtém ou cria o cliente no Asaas
  const asaasCustomerId = await getOrCreateCustomer(customer);

  //Cria a cobrança
  const chargePayload = {
    customer: asaasCustomerId,
    billingType: method,
    value: finalValue,
    dueDate: new Date().toISOString().split("T")[0], //Data atual no formato YYYY-MM-DD
    description,
    externalReference,
    postalService: false,
  };

  try {
    const { data: charge } = await api.post("/lean/payments", chargePayload);
    return {
      success: true,
      paymentId: charge.id,
      invoiceUrl: charge.invoiceUrl,
      pixQrCode: method === "PIX" ? charge.pixQrCode : null,
      financials: {
        original: value,
        total: finalValue,
        fee: calculatedFee,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Erro ao criar cobrança no ASAAS:",
        error.response?.data || error.message
      );
    } else if (error instanceof Error) {
      console.error("Erro ao generico", error);
    }
    else{
        console.error("Erro desconhecido:", error);
    }
    throw new Error("Erro ao criar cobrança no gateway de pagamento.");
  }
}
