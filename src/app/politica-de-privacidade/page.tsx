import Link from "next/link";
import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade | BemCasados",
  description:
    "Como o BemCasados trata os dados pessoais de casais e convidados, conforme a LGPD.",
  robots: { index: true, follow: true },
};

/**
 * ATENÇÃO: revisar com apoio jurídico antes de publicar.
 * Os campos entre colchetes precisam ser preenchidos com os dados reais do
 * controlador — sem eles a política não cumpre o art. 9º da LGPD.
 */
const CONTROLADOR = "[RAZÃO SOCIAL], CNPJ [00.000.000/0001-00]";
const CONTATO_ENCARREGADO = "[privacidade@bemcasadosapp.com.br]";

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="4 de agosto de 2026">
      <p>
        Esta política explica como o BemCasados trata dados pessoais, em conformidade
        com a Lei nº 13.709/2018 (LGPD). Ela vale tanto para os casais que criam uma
        lista quanto para os convidados que presenteiam.
      </p>

      <LegalSection title="1. Quem é o controlador">
        <p>
          O controlador dos dados é {CONTROLADOR}. Dúvidas, solicitações e pedidos
          relacionados a dados pessoais devem ser enviados para{" "}
          <strong>{CONTATO_ENCARREGADO}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <p>
          <strong>Do casal (titular da conta):</strong> nome, e-mail, senha (armazenada
          apenas como hash, nunca em texto legível), nome do casal, data e nome do
          evento, endereço da página pública, além das fotos e textos que o casal
          escolhe publicar.
        </p>
        <p>
          <strong>Do convidado:</strong> nome, e-mail, CPF ou CNPJ, a mensagem opcional
          deixada ao casal e os dados da contribuição (valor, forma de pagamento e
          situação).
        </p>
        <p>
          O CPF é solicitado porque a instituição de pagamento exige o documento para
          emitir a cobrança. Ele é transmitido ao Asaas e{" "}
          <strong>não fica armazenado em nossa base</strong>: guardamos apenas uma
          versão mascarada (por exemplo, <code>•••.•••.890-••</code>), suficiente para o
          casal reconhecer o pagamento e para atendimento.
        </p>
      </LegalSection>

      <LegalSection title="3. Para que usamos e com qual base legal">
        <ul>
          <li>
            <strong>Processar a contribuição</strong> (nome, e-mail, CPF/CNPJ, valor) —
            base legal: execução de contrato e procedimentos preliminares, art. 7º, V.
          </li>
          <li>
            <strong>Manter a conta do casal</strong> (nome, e-mail, senha) — base legal:
            execução de contrato, art. 7º, V.
          </li>
          <li>
            <strong>Exibir a página do casamento</strong> (fotos, textos, lista de
            presentes) — base legal: execução de contrato, por solicitação do casal.
          </li>
          <li>
            <strong>Cumprir obrigações fiscais e contábeis</strong> sobre as transações —
            base legal: cumprimento de obrigação legal, art. 7º, II.
          </li>
          <li>
            <strong>Segurança e prevenção a fraude</strong> (registros de acesso) — base
            legal: legítimo interesse, art. 7º, IX.
          </li>
        </ul>
        <p>
          Não usamos dados pessoais para publicidade, não fazemos perfilamento e não
          vendemos dados a terceiros.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <ul>
          <li>
            <strong>Asaas</strong> — instituição de pagamento que processa as cobranças.
            Recebe nome, e-mail e CPF/CNPJ do convidado. Atua como operador.
          </li>
          <li>
            <strong>Provedor de infraestrutura</strong> — hospeda a aplicação, o banco de
            dados e as imagens.
          </li>
          <li>
            <strong>Autoridades públicas</strong> — apenas mediante requisição legal.
          </li>
        </ul>
        <p>
          A página pública do casamento é acessível por qualquer pessoa que tenha o
          endereço. As fotos e textos que o casal publica ali ficam visíveis a quem
          acessar o link.
        </p>
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <ul>
          <li>
            <strong>Dados de transação</strong> (nome, e-mail, CPF mascarado, valores):
            5 anos a partir da transação, prazo ligado a obrigações fiscais e à
            prescrição civil.
          </li>
          <li>
            <strong>Conta e conteúdo do evento</strong> (fotos, textos, lista): enquanto a
            conta existir. Encerrada a conta, são excluídos.
          </li>
          <li>
            <strong>Registros de acesso</strong>: 6 meses, conforme o Marco Civil da
            Internet.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>
          A LGPD (art. 18) garante a você: confirmação de que tratamos seus dados;
          acesso a eles; correção de dados incompletos ou desatualizados; anonimização,
          bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a
          lei; portabilidade; informação sobre compartilhamento; e revogação do
          consentimento, quando essa for a base legal.
        </p>
        <p>
          Para exercer qualquer um deles, escreva para{" "}
          <strong>{CONTATO_ENCARREGADO}</strong>. Respondemos em até 15 dias.
        </p>
        <p>
          Dados que precisamos manter para cumprir obrigação legal — como o registro
          fiscal de uma transação — não podem ser excluídos antes do prazo, mesmo a
          pedido. Nesse caso informamos o motivo e o prazo restante.
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          As conexões usam HTTPS. As senhas são guardadas apenas como hash bcrypt. O
          acesso ao painel exige autenticação e cada casal só enxerga o próprio evento.
          As imagens ficam em armazenamento privado, servidas pela aplicação. Nenhuma
          medida elimina totalmente o risco, mas mantemos as dependências atualizadas e
          monitoramos vulnerabilidades conhecidas.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Usamos apenas cookies necessários ao funcionamento: os que mantêm a sessão do
          casal autenticado e o token de proteção contra CSRF. Não há cookies de
          publicidade, analytics ou rastreamento de terceiros — por isso não exibimos
          banner de consentimento.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações">
        <p>
          Mudanças relevantes nesta política serão publicadas nesta página com nova data
          de atualização.
        </p>
      </LegalSection>

      <p className="pt-4">
        Veja também os{" "}
        <Link href="/termos-de-uso" className="text-rose-600 underline hover:text-rose-700">
          Termos de Uso
        </Link>
        .
      </p>
    </LegalPage>
  );
}
