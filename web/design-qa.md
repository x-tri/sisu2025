# Design QA — Estatísticas do XTRI SISU

Data: 2026-08-05
Implementação: `http://localhost:3100/?courseCode=2507`

## Estado comparado

- Curso: Biomedicina, Universidade Federal do Rio Grande do Norte, campus de Natal.
- Aba: Estatísticas.
- Modalidade: Ampla concorrência.
- Viewports CSS: 1440×900 no desktop e 390×844 no mobile.
- As capturas do navegador embutido são exportadas na densidade da tela do aplicativo. Para a comparação lado a lado não houve reamostragem do conteúdo: somente foi aplicado preenchimento branco de 1–2 px no desktop e de até 5 px no mobile para igualar os canvases.

## Evidências visuais

### Desktop — visão completa

- Referência: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-source-desktop-top.png` (946×894 px).
- Implementação final: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-xtri-desktop-final-2.png` (947×895 px).
- Comparação normalizada: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-comparison-desktop-final-2.png` (1894×895 px).

### Mobile — visão completa e região dos gráficos

- Referência superior: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-source-mobile-top-state.png`.
- Implementação superior: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-xtri-mobile-final.png`.
- Comparação superior: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-comparison-mobile-final.png` (764×827 px).
- Referência focal dos gráficos: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-source-mobile-second-final.png`.
- Implementação focal dos gráficos: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-xtri-mobile-second-final.png`.
- Comparação focal: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-audit/stats-comparison-mobile-second-final.png` (764×827 px).

## Resultado por superfície

- Hierarquia: cabeçalho do curso, tabs, seletor de modalidade e sequência de cards reproduzem a estrutura visual observada na referência.
- Tipografia: Inter, pesos, escala, títulos e densidade estão alinhados. O nome oficial completo da modalidade é preservado.
- Gráficos: os três cards entregam comparativo diário das parciais, distribuição das notas ponderadas dos aprovados disponíveis e histórico dos cortes SISU. No desktop, as áreas de plotagem têm 234 px, como na referência.
- Mobile: cada gráfico usa rolagem interna horizontal; o documento permanece com `scrollWidth === clientWidth`. As barras de rolagem visuais foram ocultadas e os valores redundantes foram removidos no viewport estreito para evitar colisões.
- Cores e superfícies: azul XTRI, laranja de comparação, fundo, bordas, raio, grids e espaçamento mantêm a linguagem visual existente.
- Ativos: somente logo e identidade XTRI aparecem na implementação. Ícones e gráficos são renderizados como componentes reais, sem ativos falsos.
- Conteúdo: os cortes vêm da base XTRI e não são escondidos por um status meramente administrativo de verificação. Só uma divergência explícita suspende a margem comparativa.
- Sigla: a universidade é exibida como UFRN a partir de um registro explícito, sem gerar siglas heurísticas incorretas.

## Histórico de correções visuais

1. Achado P2 inicial: o seletor local estava limitado a 32rem; havia três edições no gráfico parcial; o plot desktop tinha 184 px contra 234 px na referência; os rótulos colidiam no mobile.
   - Correção: seletor em largura total, duas edições mais recentes, 234 px no desktop/184 px no mobile e rótulos numéricos ocultos no mobile.
2. Achado P2: largura rígida do gráfico prejudicava o primeiro agrupamento e expunha scrollbars; rótulos das duas séries ocupavam a mesma posição.
   - Correção: largura dinâmica, rolagem interna sem scrollbar visível e rótulos atuais/anteriores posicionados acima e abaixo da linha. A evidência pós-correção é `stats-comparison-desktop-final-2.png` e `stats-comparison-mobile-second-final.png`.

## Diferenças intencionais

- A implementação preserva integralmente a marca XTRI e não referencia terceiros na interface.
- Há uma linha própria de retorno e código do curso porque a aplicação XTRI mantém a navegação na mesma página.
- O segundo gráfico usa mínimo, média, mediana e máximo da nota ponderada dos registros disponíveis. A base consultada não fornece as cinco notas ENEM por área para esses aprovados; a interface informa a cobertura e não inventa médias por área.
- A nomenclatura oficial completa da modalidade substitui abreviações informais.
- O foco de teclado é mais evidente que na referência, por decisão de acessibilidade.

## Achados finais

- P0: nenhum.
- P1: nenhum.
- P2: nenhum aberto.
- P3: a linha de retorno/código acrescenta cerca de 40 px antes do conteúdo estatístico; é uma diferença intencional de navegação. O contorno de foco também é deliberadamente mais forte.

## Verificações automatizadas

- Testes unitários e de contrato: 28/28 aprovados.
- Playwright: 18/18 aprovados, cobrindo 320×568, 360×800, 390×844, 768×1024 e 1440×900.
- Axe: nenhuma violação séria ou crítica.
- TypeScript: aprovado.
- Build Next.js: aprovado.
- `git diff --check`: aprovado.

final result: passed

---

# Design QA — Plano de Pontos XTRI

Data: 2026-08-06
Implementação: `http://127.0.0.1:3100/?courseCode=1877`

## Estado comparado

- Curso: Medicina, Fundação Universidade Federal da Grande Dourados, Dourados/MS.
- Modalidade: Ampla concorrência.
- Edição: SISU 2026.
- Notas usadas apenas para reproduzir o estado visual: Linguagens 728,20; Humanas 760,30; Natureza 812,60; Matemática 743,10; Redação 860,00.
- A referência visual foi normalizada para o viewport efetivo do navegador embutido, sem recorte ou alteração estrutural.

## Evidências visuais

### Desktop — direção escolhida e implementação

- Referência escolhida: `/Users/home/.codex/generated_images/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/exec-a59ffe59-b3e9-440d-b4ce-6c18b5f17c72.png` (1487×1058 px).
- Referência normalizada: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/source-normalized-1057.png` (1057×1016 px).
- Implementação final: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/implementation-desktop-1065-v5.png` (1057×1016 px).
- Comparação lado a lado: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/comparison-desktop-final.png` (2114×1016 px).

### Mobile — jornada, plano e navegação

- Início da oferta: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/implementation-mobile-top-v1.png` (382×827 px).
- Simulador, proveniência e leitura das áreas: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/implementation-mobile-plan-v1.png` (382×827 px).
- Menu com os destinos do ecossistema: `/Users/home/.codex/visualizations/2026/08/05/019fd3ef-1ce8-75a0-91a6-bcb67a148d00/xtri-plan/implementation-mobile-menu-final-2.png` (382×827 px).

## Resultado por superfície

- Identidade: cabeçalho em azul-marinho, ciano e laranja XTRI, logotipo preservado e tipografia Space Grotesk + Inter.
- Poucos cliques: no curso selecionado, a busca global fica no cabeçalho; um único clique retorna ao campo já focado. Notas, meta e recálculo permanecem na mesma tela.
- Didática: quatro passos explicam onde o aluno está, a distância para a referência, o peso das áreas e como ajustar as notas. “Impacto” é definido como participação do peso, nunca como chance.
- Acurácia: os pesos e cortes exibidos são os dados reais da oferta; diferenças visuais em relação aos números do mock são intencionais. Modalidade e edição permanecem explícitas.
- Transparência: modalidade, edição, pesos, fonte, captura, checagem e link oficial são visíveis no painel de origem.
- Mobile: curso, modalidade, tabs, notas, pesos, simulador e origem empilham sem overflow horizontal. O menu expõe XTRI, Ranking ENEM para escolas e Instagram @xandaoxtri.
- Estados: sem notas, a interface pede as cinco notas em vez de afirmar incorretamente que mínimos foram reprovados.

## Histórico de correções visuais

1. Achado P1: o ícone do curso ocupava toda a primeira coluna por conflito de especificidade e criava uma faixa vazia grande.
   - Correção: identidade do curso recebeu layout flexível explícito e o contexto foi compactado.
2. Achado P2: no viewport intermediário, métricas ficavam abaixo do passo a passo e empurravam as áreas para fora da primeira tela.
   - Correção: o layout em duas colunas foi mantido até 960 px; abaixo disso, o conteúdo empilha em uma coluna.
3. Achado P2: barras de impacto apareciam verdes em todas as áreas por renderização nativa do `meter`.
   - Correção: o preenchimento passou a respeitar a cor semântica de cada disciplina.
4. Achado P2: a busca global não aparecia na tela do plano.
   - Correção: foi adicionado um acionador de busca no cabeçalho que volta ao catálogo e entrega foco ao campo principal em um clique.
5. Achado P2: o menu móvel não expunha o Instagram.
   - Correção: `@xandaoxtri` foi incluído junto aos demais destinos XTRI.

## Diferenças intencionais

- A oferta real de Medicina/UFGD 2026 usa pesos 1,0× para as cinco áreas na modalidade escolhida; o mock visual usava pesos ilustrativos diferentes.
- A implementação mantém as tabs “Estatísticas” e “Ofertas próximas” porque são fluxos funcionais existentes, ainda que não apareçam na referência estática.
- “Minhas Notas” substitui o avatar do mock e leva diretamente ao único dado pessoal necessário para o cálculo.
- A lista de favoritos não foi simulada: nenhum controle sem funcionalidade real foi adicionado.

## Achados finais

- P0: nenhum.
- P1: nenhum.
- P2: nenhum aberto.
- P3: a linha de tabs e o contexto completo da oferta adicionam altura em relação ao mock; são diferenças funcionais e deliberadas.

## Verificações automatizadas

- Testes unitários e de contrato: 28/28 aprovados.
- Playwright: 20/20 aprovados, incluindo busca em um clique e links do ecossistema.
- Responsividade: 320×568, 360×800, 390×844, 768×1024 e desktop sem rolagem horizontal.
- Axe: nenhuma violação séria ou crítica.
- TypeScript: aprovado.
- Build Next.js: aprovado.
- `git diff --check`: aprovado.

final result: passed
