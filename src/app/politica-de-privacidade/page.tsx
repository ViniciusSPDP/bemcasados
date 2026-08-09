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
    <LegalPage title="Política de Privacidade" updatedAt="9 de agosto de 2026">
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
        <p>
          <strong>Do convidado que reserva um presente na vitrine:</strong> nome,
          telefone e a mensagem opcional deixada ao casal.
        </p>
        <p>
          <strong>Do convidado que confirma presença:</strong> nome, telefone, se vai
          ou não ao casamento, o recado opcional e — quando ele leva acompanhantes —{" "}
          <strong>o nome das pessoas que vão com ele</strong>.
        </p>
        <p>
          O nome do acompanhante é informado por quem confirma, e não pela própria
          pessoa. Ele serve apenas para o casal saber quantos e quem esperar na
          cerimônia, não é usado para nenhuma outra finalidade e não é cruzado com
          nenhum outro dado. Se você é acompanhante e não quer que seu nome conste,
          basta pedir a quem confirmou que retire — ou escrever para o contato no
          fim desta página.
        </p>
        <p>
          A vitrine é uma lista de produtos vendidos por lojas parceiras (como o Mercado
          Livre). A compra acontece no site da loja, fora do BemCasados, e por isso{" "}
          <strong>nessa modalidade não coletamos nenhum dado de pagamento</strong> — nem
          CPF, nem cartão, nem valor. A reserva serve apenas para avisar os outros
          convidados de que aquele presente já está garantido.
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
            <strong>Registrar a reserva de um presente da vitrine</strong> (nome,
            telefone, mensagem) — base legal: execução de contrato e procedimentos
            preliminares a pedido do titular, art. 7º, V. O convidado informa esses
            dados por iniciativa própria, para que o casal saiba quem vai dar aquele
            presente e possa combinar a entrega. O telefone{" "}
            <strong>não é usado para publicidade</strong> e não alimenta nenhuma lista
            de contatos nossa.
          </li>
          <li>
            <strong>Registrar a confirmação de presença</strong> (nome, telefone, se vai
            ou não, recado e nome dos acompanhantes) — base legal: execução de contrato
            e procedimentos preliminares a pedido do titular, art. 7º, V. Serve para o
            casal fechar o número de convidados com o local e o serviço de alimentação.
            Não usamos para publicidade e não montamos lista de contatos.
          </li>
          <li>
            <strong>Segurança e prevenção a fraude</strong> (registros de acesso) — base
            legal: legítimo interesse, art. 7º, IX.
          </li>
        </ul>
        <p>
          Não usamos dados pessoais para publicidade, não fazemos perfilamento e não
          vendemos dados a terceiros. Também não recebemos comissão sobre dados: a
          remuneração da vitrine, quando existe, vem da loja parceira pela indicação do
          produto, nunca do tratamento de dados de quem reserva.
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
            <strong>Lojas parceiras (Mercado Livre)</strong> — a vitrine exibe links
            para produtos vendidos por terceiros. Ao clicar em &ldquo;Comprar&rdquo;,
            você sai do BemCasados e passa a ser regido pela política de privacidade da
            loja. <strong>Não enviamos a ela seu nome, telefone ou mensagem</strong>: o
            link identifica apenas o produto e a origem da indicação, e pode gerar
            comissão para o BemCasados. As fotos dos produtos são copiadas para o nosso
            próprio armazenamento e servidas por nós — justamente para que a loja não
            consiga rastrear quem visita a página do casamento.
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
        <p>
          Na vitrine, um presente já reservado aparece para os demais convidados apenas
          como <strong>&ldquo;reservado&rdquo;</strong>: o nome, o telefone e a mensagem
          de quem reservou são visíveis somente para o casal, dentro do painel.
        </p>
        <p>
          As <strong>confirmações de presença</strong> seguem a mesma regra: a lista de
          quem confirmou, os telefones e os nomes dos acompanhantes ficam apenas no
          painel do casal. Nenhum convidado vê quem mais vai ao casamento.
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
            <strong>Reservas da vitrine</strong> (nome, telefone, mensagem): enquanto a
            reserva existir. Quando o casal libera o presente pelo painel, os dados da
            reserva são <strong>apagados imediatamente</strong> — não guardamos
            histórico de reservas desfeitas. Encerrada a conta do casal, as reservas são
            excluídas junto com o evento.
          </li>
          <li>
            <strong>Confirmações de presença</strong> (nome, telefone, acompanhantes,
            recado): enquanto a conta do casal existir. Encerrada a conta, são excluídas
            junto com o evento. O casal pode apagar uma confirmação a qualquer momento
            pelo painel.
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
