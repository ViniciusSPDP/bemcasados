// src/services/asaas.ts
import axios from "axios";
import { calculateTotalWithFees, PaymentMethod } from "@/lib/fees"; 

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
  installmentCount?: number;
}

const api = axios.create({
  baseURL: process.env.ASAAS_URL,
  headers: {
    access_token: process.env.ASAAS_API_KEY,
    "Content-Type": "application/json",
  },
});

/**
 * Consulta o pagamento direto na API. O webhook não é fonte da verdade — quem
 * tiver o token consegue anunciar qualquer status, então o valor e o estado são
 * reconferidos aqui antes de liberar o presente.
 */
export async function getAsaasPayment(paymentId: string) {
  const { data } = await api.get(`/payments/${encodeURIComponent(paymentId)}`);
  return data as { id: string; status: string; value: number; externalReference?: string };
}

async function getOrCreateCustomer(data: CustomerData) {
  const cleanCpfCnpj = data.cpfCnpj.replace(/\D/g, "");

  try {
    const { data: search } = await api.get(`/customers?cpfCnpj=${cleanCpfCnpj}`);
    if (search.data && search.data.length > 0) {
      return search.data[0].id;
    }

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

export async function createAsaasCharge({
  customer,
  value,
  method,
  description,
  externalReference,
  installmentCount = 1
}: CreateChargeParams) {
  
  // 1. Calcula o valor FINAL que será cobrado do convidado
  const finalValue = calculateTotalWithFees(value, method, installmentCount);
  const calculatedFee = finalValue - value;

  const asaasCustomerId = await getOrCreateCustomer(customer);

  // 2. Monta o payload conforme a doc (usando totalValue para parcelados)
  const basePayload = {
    customer: asaasCustomerId,
    billingType: method,
    dueDate: new Date().toISOString().split("T")[0],
    description,
    externalReference,
    postalService: false,
  };

  let chargePayload;

  // Se for parcelado, usamos installmentCount e totalValue
  if (installmentCount > 1) {
    chargePayload = {
      ...basePayload,
      installmentCount,
      totalValue: finalValue, // O Asaas divide automaticamente nas parcelas
    };
  } else {
    // Se for à vista
    chargePayload = {
      ...basePayload,
      value: finalValue,
    };
  }

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
        installments: installmentCount
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error("Erro Asaas:", error.response?.data || error.message);
    }
    throw new Error("Erro ao criar cobrança no gateway.");
  }
}

// Re-exporta para compatibilidade se necessário, mas o ideal é importar de @/lib/fees
export { calculateTotalWithFees, type PaymentMethod };