import Link from "next/link";
import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso | BemCasados",
  description: "Condições de uso da plataforma BemCasados.",
  robots: { index: true, follow: true },
};

/**
 * ATENÇÃO: revisar com apoio jurídico antes de publicar.
 * Os campos entre colchetes precisam ser preenchidos com os dados reais.
 */
const PRESTADOR = "[RAZÃO SOCIAL], CNPJ [00.000.000/0001-00]";
const CONTATO = "[contato@bemcasadosapp.com.br]";

export default function TermosDeUsoPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="4 de agosto de 2026">
      <p>
        Estes termos regem o uso do BemCasados, plataforma de lista de casamento operada
        por {PRESTADOR}. Ao criar uma conta ou contribuir com um presente, você concorda
        com o que está aqui.
      </p>

      <LegalSection title="1. O que a plataforma faz">
        <p>
          O BemCasados permite que um casal monte uma página com sua lista de presentes e
          receba contribuições em dinheiro dos convidados. Cada presente da lista
          corresponde a um valor; ao escolher um item, o convidado realiza um pagamento
          que é repassado ao casal.
        </p>
        <p>
          Não vendemos, entregamos nem intermediamos produtos físicos. O que a lista
          representa é uma contribuição financeira.
        </p>
      </LegalSection>

      <LegalSection title="2. Conta do casal">
        <ul>
          <li>
            É necessário fornecer informações verdadeiras no cadastro e manter a senha em
            sigilo. As ações feitas com suas credenciais são de sua responsabilidade.
          </li>
          <li>
            Cada conta administra um evento. O endereço público escolhido (o link) é
            único e concedido por ordem de cadastro.
          </li>
          <li>
            O casal é responsável pelo conteúdo que publica — fotos, textos e itens da
            lista — e declara ter autorização das pessoas retratadas nas imagens.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pagamentos e taxas">
        <ul>
          <li>
            Os pagamentos são processados pelo Asaas, instituição de pagamento
            responsável por PIX, boleto e cartão de crédito.
          </li>
          <li>
            As taxas da instituição de pagamento são acrescidas ao valor do presente e
            pagas pelo convidado. O total é exibido antes da confirmação.
          </li>
          <li>
            Uma contribuição só é considerada concluída após a confirmação do pagamento
            pela instituição. Até lá o presente permanece disponível na lista.
          </li>
          <li>
            Contribuições são voluntárias e, por sua natureza, não são reembolsáveis pela
            plataforma. Contestações de cobrança seguem as regras da instituição de
            pagamento e da bandeira do cartão.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso aceitável">
        <p>Não é permitido usar a plataforma para:</p>
        <ul>
          <li>publicar conteúdo ilegal, ofensivo ou que viole direitos de terceiros;</li>
          <li>captar recursos sob pretexto falso ou para finalidade diversa da anunciada;</li>
          <li>
            tentar contornar limites técnicos, sobrecarregar o serviço, acessar dados de
            outros usuários ou explorar falhas;
          </li>
          <li>enviar arquivos maliciosos ou conteúdo que não seja imagem do próprio evento.</li>
        </ul>
        <p>
          Contas que descumprirem estas regras podem ser suspensas ou encerradas, com
          aviso sempre que possível.
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilidade">
        <p>
          Trabalhamos para manter o serviço no ar, mas ele é fornecido &quot;como está&quot;, sem
          garantia de disponibilidade ininterrupta. Podem ocorrer paradas para manutenção
          ou por falha de terceiros dos quais dependemos.
        </p>
      </LegalSection>

      <LegalSection title="6. Encerramento">
        <p>
          O casal pode encerrar a conta a qualquer momento pelo contato{" "}
          <strong>{CONTATO}</strong>. O encerramento remove o evento, a lista, as fotos e
          a página pública. Registros de transações já realizadas são mantidos pelo prazo
          legal descrito na{" "}
          <Link href="/politica-de-privacidade" className="text-rose-600 underline hover:text-rose-700">
            Política de Privacidade
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Alterações e foro">
        <p>
          Estes termos podem ser atualizados; mudanças relevantes serão publicadas nesta
          página. Aplica-se a legislação brasileira, incluindo o Código de Defesa do
          Consumidor e a LGPD.
        </p>
      </LegalSection>

      <p className="pt-4">
        Dúvidas: <strong>{CONTATO}</strong>.
      </p>
    </LegalPage>
  );
}
