import type { Metadata } from 'next'
import Link from 'next/link'

import SeoShell, { type Crumb } from '@/components/seo/SeoShell'
import styles from '@/components/seo/SeoShell.module.css'
import policy from './page.module.css'

const PATH = '/politica-de-privacidade'
const CRUMBS: Crumb[] = [{ name: 'Simulador SISU', href: '/' }, { name: 'Política de Privacidade' }]
const DESCRIPTION =
  'Como o XTRI SISU trata dados pessoais: sem cadastro, notas do ENEM processadas no seu navegador e nenhum cookie de rastreamento. Política em conformidade com a LGPD.'
const UPDATED_AT = '18 de novembro de 2026'

export const metadata: Metadata = {
  title: 'Política de Privacidade e Cookies',
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Política de Privacidade e Cookies | XTRI SISU',
    description: DESCRIPTION,
    url: PATH,
  },
}

export default function PrivacyPage(): JSX.Element {
  return (
    <SeoShell crumbs={CRUMBS} currentPath={PATH}>
      <section className={styles.hero}>
        <h1>Política de Privacidade e Cookies</h1>
        <p className={styles.heroMeta}>
          Este site é mantido pela XTRI, CNPJ 42.535.768/0001-00, com sede em Natal/RN, controladora dos dados
          pessoais tratados aqui. Política em conformidade com a Lei nº 13.709/2018 (LGPD).
        </p>
        <p className={policy.updated}>Última atualização: {UPDATED_AT}</p>
      </section>

      <section className={styles.card} aria-label="Resumo">
        <h2>Resumo em três linhas</h2>
        <ul className={policy.summary}>
          <li>
            <strong>Sem cadastro.</strong> Não pedimos nome, e-mail ou login para simular.
          </li>
          <li>
            <strong>Suas notas ficam no seu navegador.</strong> O cálculo é feito no seu dispositivo. Elas só são
            guardadas se você marcar “Lembrar por 30 dias”.
          </li>
          <li>
            <strong>Nenhum cookie de rastreamento.</strong> Não usamos Google Analytics, pixels de anúncio ou
            qualquer script de terceiros.
          </li>
        </ul>
      </section>

      <article className={policy.policy}>
        <section className={policy.section} aria-labelledby="quem-somos">
          <h2 id="quem-somos">1. Quem somos</h2>
          <p>
            O site xtrisisu.com é mantido pela <strong>XTRI</strong> (CNPJ 42.535.768/0001-00), com sede em
            Natal/RN, que atua como controladora dos dados pessoais tratados neste site.
          </p>
          <p>
            Encarregado pelo Tratamento de Dados Pessoais (DPO), nos termos do art. 41 da LGPD: contato para
            assuntos de privacidade em <a href="mailto:contato@xtri.online">contato@xtri.online</a>.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="dados">
          <h2 id="dados">2. Quais dados tratamos</h2>

          <h3>2.1 Notas do ENEM</h3>
          <p>
            As cinco notas que você digita (Linguagens, Humanas, Natureza, Matemática e Redação) são usadas
            <strong> apenas no seu navegador</strong> para calcular a nota ponderada de cada curso e comparar com as
            referências de corte. Elas <strong>não são enviadas aos nossos servidores</strong> e não são associadas a
            você.
          </p>
          <p>
            Se você marcar a opção “Lembrar por 30 dias”, as notas são gravadas no armazenamento local do seu
            navegador (chave <code>sisu_scores</code>) e expiram automaticamente em 30 dias. Você pode apagá-las a
            qualquer momento limpando os dados do site no navegador.
          </p>

          <h3>2.2 Consultas ao catálogo de cursos</h3>
          <p>
            Para listar cursos, estados, cidades e notas de corte, o seu navegador envia à nossa API apenas os
            parâmetros da consulta (por exemplo, curso, estado ou página). Essas requisições não incluem suas notas
            nem qualquer identificação pessoal, porque o site não tem login.
          </p>

          <h3>2.3 Registros de acesso</h3>
          <p>
            Nossa infraestrutura registra dados técnicos de acesso, como endereço IP, data e hora, navegador e
            página solicitada. Esses registros são usados para segurança, prevenção de abuso e estabilidade do
            serviço.
          </p>

          <h3>2.4 Contato voluntário</h3>
          <p>
            Se você falar com a gente por e-mail ou WhatsApp, tratamos os dados que você fornecer para responder à
            solicitação e manter o histórico do atendimento.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="bases">
          <h2 id="bases">3. Base legal</h2>
          <ul className={policy.list}>
            <li>
              <strong>Notas do ENEM:</strong> consentimento do titular (art. 7º, I), manifestado ao digitar as notas
              e, opcionalmente, ao marcar “Lembrar por 30 dias”. O tratamento ocorre no seu dispositivo.
            </li>
            <li>
              <strong>Consultas ao catálogo e registros de acesso:</strong> legítimo interesse na operação,
              segurança e melhoria do serviço (art. 7º, IX).
            </li>
            <li>
              <strong>Contato:</strong> procedimentos preliminares a contrato ou legítimo interesse, conforme o caso
              (art. 7º, V e IX).
            </li>
          </ul>
        </section>

        <section className={policy.section} aria-labelledby="cookies">
          <h2 id="cookies">4. Cookies e armazenamento local</h2>
          <p>
            <strong>Este site não utiliza cookies.</strong> Não há cookies próprios, cookies de terceiros, Google
            Analytics, Google Ads, Meta Pixel, Hotjar ou qualquer ferramenta de rastreamento. Por isso não existe
            banner de consentimento de cookies: não há nada a autorizar.
          </p>
          <div
            className={policy.tableWrap}
            role="region"
            aria-label="Tabela de armazenamento usado pelo site"
            tabIndex={0}
          >
            <table className={policy.table}>
              <caption>Armazenamento usado pelo site</caption>
              <thead>
                <tr>
                  <th scope="col">Chave</th>
                  <th scope="col">Onde</th>
                  <th scope="col">Para quê</th>
                  <th scope="col">Duração</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>sisu_scores</code></td>
                  <td>Armazenamento local do navegador</td>
                  <td>Relembrar suas notas entre visitas, se você marcar a opção</td>
                  <td>30 dias, ou até você limpar</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={policy.note}>
            Se no futuro adicionarmos métricas de audiência, elas só serão ativadas após o seu consentimento
            explícito, com opção de recusar, e esta política será atualizada.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="compartilhamento">
          <h2 id="compartilhamento">5. Compartilhamento e transferência internacional</h2>
          <p>
            Não vendemos dados pessoais e não os cedemos para publicidade. Utilizamos provedores de infraestrutura
            que atuam como operadores, exclusivamente para hospedar o site e armazenar a base pública de notas de
            corte: a Hostinger (hospedagem) e o Supabase (banco de dados). Esses provedores podem processar dados
            fora do Brasil, hipótese amparada pelo art. 33 da LGPD e pelas cláusulas contratuais de proteção de
            dados de cada fornecedor.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="retencao">
          <h2 id="retencao">6. Prazo de retenção</h2>
          <ul className={policy.list}>
            <li>Notas no navegador: até 30 dias após a gravação, ou até você apagá-las.</li>
            <li>Registros de acesso: pelo prazo necessário à segurança e às obrigações legais aplicáveis.</li>
            <li>Mensagens de contato: pelo tempo necessário ao atendimento e ao cumprimento de obrigações legais.</li>
          </ul>
        </section>

        <section className={policy.section} aria-labelledby="direitos">
          <h2 id="direitos">7. Seus direitos</h2>
          <p>
            Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento: confirmação da existência de
            tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos,
            portabilidade, informação sobre compartilhamentos, revogação do consentimento e oposição a tratamentos.
          </p>
          <p>
            Para exercer esses direitos, escreva para <a href="mailto:contato@xtri.online">contato@xtri.online</a>.
            Responderemos nos prazos legais. Você também pode peticionar à Autoridade Nacional de Proteção de Dados
            (ANPD).
          </p>
        </section>

        <section className={policy.section} aria-labelledby="criancas">
          <h2 id="criancas">8. Crianças e adolescentes</h2>
          <p>
            O simulador é destinado a estudantes do ensino médio e a profissionais de educação. Como o cálculo é
            feito no navegador e não há cadastro, não coletamos intencionalmente dados pessoais de crianças ou
            adolescentes. Pais ou responsáveis podem exercer os direitos previstos nesta política pelo contato
            acima.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="seguranca">
          <h2 id="seguranca">9. Segurança</h2>
          <p>
            O site opera sob HTTPS e mantém atualizações de segurança na aplicação e na infraestrutura. Nenhum
            sistema é absolutamente invulnerável; em caso de incidente de segurança relevante, comunicaremos os
            titulares afetados e a ANPD conforme a lei.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="alteracoes">
          <h2 id="alteracoes">10. Alterações desta política</h2>
          <p>
            Alterações relevantes serão publicadas nesta página com nova data de atualização. Recomendamos revisar
            esta política periodicamente.
          </p>
        </section>

        <section className={policy.section} aria-labelledby="contato">
          <h2 id="contato">11. Contato</h2>
          <p>
            Dúvidas sobre privacidade e proteção de dados:{' '}
            <a href="mailto:contato@xtri.online">contato@xtri.online</a>.
          </p>
          <p className={policy.back}>
            <Link href="/">Voltar ao simulador</Link>
          </p>
        </section>
      </article>
    </SeoShell>
  )
}
