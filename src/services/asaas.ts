// src/services/asaas.ts
import axios from "axios";
import { calculateTotalWithFees, PaymentMethod } from "@/lib/fees";

// --- TIPAGENS GERAIS ---

type CompanyType = "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";

interface CreateSubAccountParams {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  incomeValue: number;
  address: string;
  addressNumber: string;
  province: string;
  postalCode: string;
  companyType?: CompanyType; 
  birthDate?: string;        
}

interface SubAccountResponse {
  id: string;
  name: string;
  email: string;
  apiKey: string;   
  walletId: string; 
}

interface CustomerData {
  name: string;
  cpfCnpj: string;
  email: string;
}

interface AsaasStatusResponse {
  commercialInfo: string;
  bankAccountInfo: string;
  documentation: string;
  general: string;
}

// Interfaces removidas (AsaasDocument) pois não buscaremos links White Label

// --- TIPAGENS PARA CARTÃO DE CRÉDITO ---

interface CreditCardInfo {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  mobilePhone: string;
}

// --- TIPAGENS PARA COBRANÇAS ---

interface CreateChargeParams {
  customer: CustomerData;
  value: number;
  method: PaymentMethod;
  description: string;
  externalReference: string;
  installmentCount?: number;
  subAccountApiKey: string;
  creditCard?: CreditCardInfo;
  creditCardHolderInfo?: CreditCardHolderInfo;
  remoteIp?: string;
}

interface ChargeResponse {
  success: boolean;
  paymentId: string;
  invoiceUrl: string;
  pixQrCode: string | null;
  status?: string;
  financials: {
    original: number;
    total: number;
    fee: number;
    installments: number;
  };
}

// --- CONFIGURAÇÃO DA API ---

const api = axios.create({
  baseURL: process.env.ASAAS_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- FUNÇÕES DE CONTA ---

export async function createAsaasSubAccount(
  subAccountData: CreateSubAccountParams
): Promise<SubAccountResponse> {
  try {
    const { data } = await api.post("/accounts", {
      ...subAccountData,
      incomeValue: subAccountData.incomeValue || 5000,
      webhooks: [
        {
          name: "Webhook Plataforma Master",
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/asaas`,
          email: subAccountData.email, 
          enabled: true,
          interrupted: false, 
          apiVersion: 3,
          authToken: process.env.ASAAS_WEBHOOK_TOKEN,
          sendType: "SEQUENTIALLY", 
          events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]
        }
      ]
    }, {
      headers: { access_token: process.env.ASAAS_API_KEY } 
    });

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      apiKey: data.apiKey, 
      walletId: data.walletId, 
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const asaasErrors = error.response?.data?.errors;
      if (asaasErrors && asaasErrors.length > 0) {
        throw new Error(asaasErrors[0].description);
      }
    }
    throw new Error("Não foi possível criar a subconta no gateway.");
  }
}

async function getOrCreateCustomer(data: CustomerData, subAccountApiKey: string): Promise<string> {
  const cleanCpfCnpj = data.cpfCnpj.replace(/\D/g, "");
  const headers = { access_token: subAccountApiKey };

  try {
    const { data: search } = await api.get(`/customers?cpfCnpj=${cleanCpfCnpj}`, { headers });
    if (search.data && search.data.length > 0) {
      return search.data[0].id;
    }

    const { data: newCustomer } = await api.post("/customers", {
      name: data.name,
      cpfCnpj: cleanCpfCnpj,
      email: data.email,
    }, { headers });
    return newCustomer.id;
  } catch (error: unknown) {
    console.error("Erro ao gerenciar cliente no ASAAS:", error);
    throw new Error("Erro ao processar dados do cliente no gateway.");
  }
}

// --- FUNÇÕES DE PAGAMENTO ---

export async function createAsaasCharge({
  customer,
  value,
  method,
  description,
  externalReference,
  installmentCount = 1,
  subAccountApiKey,
  creditCard,
  creditCardHolderInfo,
  remoteIp
}: CreateChargeParams): Promise<ChargeResponse> {
  
  const finalValue = calculateTotalWithFees(value, method, installmentCount);
  const calculatedFee = finalValue - value;
  const asaasCustomerId = await getOrCreateCustomer(customer, subAccountApiKey);

  const chargePayload = {
    customer: asaasCustomerId,
    billingType: method,
    dueDate: new Date().toISOString().split("T")[0],
    description,
    externalReference,
    postalService: false,
    split: [
      {
        walletId: process.env.ASAAS_PLATFORM_WALLET_ID, 
        percentualValue: 1,
      }
    ],
    ...(method === "CREDIT_CARD" && creditCard && {
      creditCard,
      creditCardHolderInfo,
      remoteIp
    }),
    ...(installmentCount > 1 
      ? { installmentCount, totalValue: finalValue }
      : { value: finalValue })
  };

  try {
    const { data: charge } = await api.post("/payments", chargePayload, {
      headers: { access_token: subAccountApiKey } 
    });
    
    return {
      success: true,
      paymentId: charge.id,
      invoiceUrl: charge.invoiceUrl,
      pixQrCode: method === "PIX" ? charge.pixQrCode : null,
      status: charge.status,
      financials: {
        original: value,
        total: finalValue,
        fee: calculatedFee,
        installments: installmentCount
      },
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
        const asaasErrors = error.response?.data?.errors;
        if (asaasErrors && asaasErrors.length > 0) {
            throw new Error(asaasErrors[0].description);
        }
    }
    throw new Error("Erro ao criar cobrança no gateway.");
  }
}

// --- UTILITÁRIOS (PIX/BOLETO) ---

export async function getPixQrCode(paymentId: string, subAccountApiKey: string) {
  try {
    const { data } = await api.get(`/payments/${paymentId}/pixQrCode`, {
      headers: { access_token: subAccountApiKey }
    });
    return {
      encodedImage: data.encodedImage, 
      payload: data.payload 
    };
  } catch (error) {
    console.error("Erro ao gerar QR Code PIX:", error);
    return null;
  }
}

export async function getBoletoCode(paymentId: string, subAccountApiKey: string) {
  try {
    const { data } = await api.get(`/payments/${paymentId}/identificationField`, {
      headers: { access_token: subAccountApiKey }
    });
    return data.identificationField;
  } catch (error) {
    console.error("Erro ao buscar linha digitável:", error);
    return null;
  }
}

// --- FUNÇÕES FINANCEIRAS ---

export async function getAsaasBalance(subAccountApiKey: string): Promise<number> {
  try {
    const { data } = await api.get("/finance/balance", {
      headers: { access_token: subAccountApiKey }
    });
    return data.balance;
  } catch {
    return 0;
  }
}

export async function transferAsaasBalance(
  subAccountApiKey: string, 
  amount: number, 
  pixKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    await api.post("/transfers", {
      value: amount,
      pixAddressKey: pixKey,
      pixAddressKeyType: "EVP",
      scheduleDate: new Date().toISOString().split("T")[0]
    }, {
      headers: { access_token: subAccountApiKey }
    });

    return { success: true, message: "Saque solicitado com sucesso!" };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
        const description = error.response?.data?.errors?.[0]?.description;
        return { success: false, message: description || "Erro ao processar saque." };
    }
    return { success: false, message: "Erro interno no gateway." };
  }
}

export async function getAsaasTransferHistory(subAccountApiKey: string) {
  try {
    const { data } = await api.get("/transfers?limit=5", {
      headers: { access_token: subAccountApiKey }
    });
    return data.data; 
  } catch (error) {
    console.error("Erro ao buscar histórico de saques:", error);
    return [];
  }
}

// --- DOCUMENTAÇÃO E KYC (MODO PADRÃO) ---

export async function getAsaasOnboardingLink(subAccountApiKey: string): Promise<string> {
  const headers = { access_token: subAccountApiKey };
  try {
    const { data: status } = await api.get<AsaasStatusResponse>("/myAccount/status", { headers });
    
    if (status.general === "APPROVED") {
        throw new Error("Sua conta já está totalmente aprovada!");
    }

    // No modo padrão, o usuário deve usar o e-mail de boas-vindas enviado pelo Asaas
    throw new Error("Acesse o e-mail enviado pelo Asaas para definir sua senha e enviar seus documentos pelo painel oficial.");

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro ao verificar status da conta.";
    throw new Error(errorMessage);
  }
}

export async function isAsaasAccountApproved(subAccountApiKey: string): Promise<boolean> {
  try {
    const { data } = await api.get<AsaasStatusResponse>("/myAccount/status", {
      headers: { access_token: subAccountApiKey }
    });
    // O PIX e saques só funcionam quando 'general' é 'APPROVED'
    return data.general === "APPROVED";
  } catch {
    return false;
  }
}

export async function updateAsaasBankAccount(
  subAccountApiKey: string, 
  pixKey: string,
  pixType: string
): Promise<boolean> {
  try {
    await api.post("/pix/addressKeys", { type: pixType, key: pixKey }, {
      headers: { access_token: subAccountApiKey }
    });
    return true;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
        console.error("Erro Asaas PIX:", error.response?.data);
    }
    throw error;
  }
}

export { calculateTotalWithFees, type PaymentMethod };