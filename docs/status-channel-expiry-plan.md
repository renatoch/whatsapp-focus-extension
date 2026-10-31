# Plano — Expiração focada em Status e Canais

**Estado:** concluído e aceito pelo Navigator — “Tá ótimo, pode fechar”. Status,
layout de Canais e reconhecimento pelo cabeçalho encerrados após validação do usuário.
212 testes passaram no checkpoint final; Chrome dedicado e porta 9222 fechados.
As pendências dos checkpoints abaixo são históricas.
Não autoriza novos recursos, retomada de DS6, merge ou release.

## Correção do reconhecimento sem seleção na lista

Evidência de reentrada mostrou #main aberto sem aria-selected nos itens, mesmo com
foco/visibilidade verdadeiros. Cabeçalho nativo do canal possui botão de notificações;
conversa escolhida pelo Navigator possui Pesquisar. O classificador aceita esse
controle visível e escopado ao cabeçalho, exigindo drawer + #main visíveis e ausência
de footer/editor. Sem cache de títulos, sem presumir que qualquer #main seja canal.
212/212 testes; correção posteriormente aceita pelo Navigator. Status e política de
foco permanecem inalterados. Detalhes em surface-aware-expiry.md.

## Ajuste de consistência visual

Navigator confirmou Status como esperado. Para Canais, solicitou manter a coluna
lateral reservada e ocultar somente seu conteúdo (não expandir o canal). CSS trocado
de display:none para visibility:hidden/pointer-events:none nos mesmos alvos, também
em descendentes para não vazar conteúdo nativo. Nenhuma alteração de Status. Suíte:
202/202; confirmação visual desta geometria pendente.

## Investigação da regressão

A expiração real reproduziu canal reconhecido + aba visível + documento sem foco →
retorno cego pela regra antiga. Marcadores permaneceram estáveis após ocultação;
não houve evidência de perda de seleção/virtualização. Navigator confirmou manter
a política antiga: sem foco no documento ou aba oculta, retornar ao Modo foco,
mesmo com falsos negativos. Não ampliar a exceção para outro aplicativo. Retomada explícita do canal pelo overlay foi corrigida e coberta
por testes, sem novo bypass, normalização ou captura de título. Suíte após atalho de teste, retirada do popup legado e correção urgente de loop
no observer: 202. A atualização de rótulo Continue deve ser idempotente para não
realimentar o observer de childList e travar a aba. Ver evidência vinculada. Alt+Shift+T alterna
10s/5min na próxima abertura, só na aba, sem reload recorrente. O popup do Chrome
contém informações e atalhos; as ferramentas de cópia ficam no menu lateral.
Login/vinculação foi solicitado como próxima atividade, sem deslogar contas; ver
[plano seguinte](login-surface-plan.md).

## Resultado da execução

- [Evidência, arquitetura e rota curta de aceitação](surface-aware-expiry.md).
- 195/195 testes; novo `native-surface.js` identifica primeiro plano por marcadores
  observados; `surface-expiry.js` possui o prazo/continuação e invalida callbacks antigos.
- Canal selecionado mantém #main e oculta newsletter drawer + coluna Chats por baixo;
  visualizador de Status continua e o foco retorna ao fechar para uma lista conhecida.
- Listas sem conteúdo selecionado e aba inativa mantêm retorno cego. Troca de pessoa
  em Status não é bloqueada e o prazo não é renovado. Nenhum campo de telemetria novo.
- Teste temporário de geometria no perfil dedicado confirmou ocultação sem trocar
  o nó #main. Não houve validação ao vivo do novo script recarregado. Chrome dedicado
  encerrado e porta 9222 fechada; perfil/login preservados.
- Ação pendente: Navigator recarregar extensão/aba e conferir uma expiração natural
  em canal e outra em Status. DS6 permanece sem alterações.

## Checkpoint de retomada (histórico, antes da implementação)

- Alvo: stable worktree `whatsapp-focus-extension`, branch main, base `7d99cc5`.
  DS6 permanece intacta e não será sincronizada implicitamente.
- Três caracterizações novas em `tests/normal-expiry-baseline.test.js`: limite exato
  dos cinco minutos/ordem de normalização, fallback inativo e lacuna atual de não
  consultar superfície nativa. Suíte completa: 174/174. Nenhuma mudança de produção.
- O teste da lacuna documenta temporariamente o comportamento antigo; migrar sua
  expectativa ao implementar a classificação de Status/Canal, não preservar o bug.
- Chrome dedicado iniciado com perfil MirrorWhatsAppFocusDebug, loopback 9222;
  aguardando Navigator abrir um canal escolhido, com sua lateral visível. Não
  abrir canais/conversas/status por iniciativa do agente nem ler conteúdo.
- Próximo passo exato: colher estrutura do canal selecionado, validar container
  lateral e foreground sem conteúdo; então TDD da nova política. Caso essa evidência
  seja insuficiente, pedir só a mudança de superfície necessária. Fechar o perfil
  e verificar porta fechada ao fim da investigação.
- Sem aceitação Chrome/Done ou mudança de comportamento instalada nesta etapa.

## Objetivo

Encerrar a navegação ampla depois dos cinco minutos sem interromper o conteúdo
atual nem exibir controles de conversas sobre Status/Canais. Separar o fato de o
prazo ter expirado da decisão de exibir imediatamente o Modo foco.

## Problema e evidência

O uso real mostrou expiração inconsistente em Status/Canais: às vezes interrompe
a superfície; às vezes mantém a superfície com Buscar/Adicionar/recents por cima.
A política atual de `focus-state.js` considera visibilidade, foco da aba e conversa
aberta, mas não qual superfície nativa está em primeiro plano. Um cabeçalho de
conversa atrás de Status/Canais pode influenciar essa classificação. Essa é uma
lacuna comprovada da política; a causa específica de cada ocorrência não foi
reproduzida durante esta conversa.

Já houve inspeção estrutural dedicada de Status e correções de sobreposição fora
da expiração. Marcadores observados: `status-player-contact-name` no visualizador;
`status-drawer` e `status-list-drawer` na lista. Ver
[native-control-bar-priority.md](native-control-bar-priority.md).
Canais inicialmente não tinha evidência; a investigação desta execução confirmou
os marcadores e o layout descritos em `surface-aware-expiry.md`. Não extrapolar para
outros layouts nem supor equivalência com o DOM de conversas comuns.

## Decisões acordadas

| Superfície no fim do prazo | Resultado desejado |
| --- | --- |
| Conversa aberta | Preservar a conversa focada, ocultando a lista lateral, como hoje. |
| Canal aberto | Preservar o canal; ocultar sua lista lateral de canais, como a lateral de conversas. |
| Status em visualização | Manter o visualizador aberto; sem cardápio/controles da extensão sobrepostos. |
| Lista de Status, sem visualizador | Retornar ao Modo foco. |

- **Status após o prazo:** fechar o visualizador e revelar a lista leva imediatamente
  ao Modo foco. A exceção vale para o visualizador aberto, sem renovar os cinco minutos.
- **Navegação entre pessoas no Status:** permanece permitida nesta primeira versão.
  Bloquear a próxima pessoa foi uma possibilidade discutida, NÃO escopo aprovado.
  Não interceptar clique, teclado ou avanço automático para tentar implementá-la.
- **Canal não tem uma etapa equivalente de “voltar à lista”.** Sua lista está
  normalmente ao lado do conteúdo; a solução é ocultá-la, não esperar uma transição
  de fechamento inexistente nem forçar navegação por Conversas/Chats.
- Não criar uma nova autorização automática de cinco minutos ao fechar Status,
  trocar de pessoa, renderizar novamente ou manter canal aberto.
- Preservar o comportamento atual de abas ocultas/sem foco; esta discussão não
  autorizou ampliar a exceção para uso inativo. Caracterizar essa interseção e
  trazer eventual conflito de produto antes de alterar sua política.

## Escopo técnico proposto

### 1. Caracterizar antes de mudar

Mapear o timer de bypass, `chooseNormalExpiryDestination`, `setNormalTemporarily`,
normalização por Chats, observer e política de suspensão de superfícies. Criar
casos determinísticos que mostrem expiração com uma conversa atrás do visualizador
e com Canais em primeiro plano; não usar apenas presença de cabeçalho de conversa.

### 2. Evidenciar Canais sem conteúdo privado

Somente quando o trabalho for retomado: usar o perfil dedicado documentado em
[local-browser-debugging.md](local-browser-debugging.md), port 9222 loopback.
Navigator escolhe e abre o canal. Inspecionar apenas marcadores estruturais,
visibilidade, ancestralidade e containers; nunca nomes, mensagens, mídia, URLs de
conteúdo ou DOM completo. Verificar canal aberto versus lista sem canal selecionado,
container lateral correto e retorno voluntário a conversas. Não experimentar
seletores genéricos ou ocultar ramos até provar o alvo. Fechar Chrome dedicado e
verificar porta fechada ao fim.

### 3. Distinguir superfície de primeiro plano e prazo

Usar classificação estrutural estreita: visualizador de Status tem precedência
sobre lista de Status; Status/Canais não podem ser classificados a partir de uma
conversa remanescente ao fundo. Manter estado de continuação pós-prazo apenas na
memória da aba, com proprietário explícito e cancelamento. Não duplicar o estado
autoritativo de modo nem espalhar timers independentes pelos renderers.

O vencimento escolhe o destino sem executar normalização para Chats quando o
conteúdo preservado é Status ou canal. No canal, aplicar ocultação somente ao
container lateral comprovado. No Status, manter a prioridade nativa/suspensão dos
controles sem overlay cego enquanto o visualizador autorizado continua aberto.

### 4. Encerrar a exceção de Status

O observer existente acompanha a saída do visualizador. Se o prazo já terminou e
reaparece a lista de Status, aplicar Modo foco uma única vez, sem clique nativo,
sem renovação e sem destruir dados de recents/coleções. Invalidar callbacks antigos
de normalização/expiry ao iniciar outro bypass ou realizar uma transição explícita.
Verificar transições com animação/DOM oculto para não confundir substituição do
visualizador com fechamento real. Não adicionar espera arbitrária sem evidência.

### 5. Preservar contratos

- Não capturar canais ou pessoas de Status como conversas recentes.
- Não alterar seleção exata, captura de títulos, expansão/scroll de coleções,
  armazenamento, permissão, estilos fora da política afetada ou atalhos.
- Não persistir superfície visitada, conteúdo, nomes ou motivo de exceção.
- Não ampliar enums/campos do awareness para representar Status/Canais. Revisar o
  significado de `focus_returned`: não registrar falsamente retorno efetivo ao foco
  enquanto apenas se preserva conteúdo nativo; usar eventos já permitidos somente
  quando correspondem ao efeito real. Fixar a ordem em testes antes de implementar.
- Falhar conservadoramente quando superfície/target for desconhecido; se a evidência
  não permitir distinguir o canal/lista, parar para decisão em vez de esconder DOM
  ou navegar por tentativa.

## Arquivos candidatos (confirmar na retomada)

- `content.js`: composição, detecção, observer e integração do bypass.
- `focus-state.js`: regra pura de destino, se a classificação for injetada aqui.
- `focus.css`: ocultação específica da lateral comprovada de Canais e suspensão.
- Testes de expiry/focus-state/native transient; novos fixtures sintéticos de Canais.
- Documentação de prioridade nativa e guia de teste vigente.

O stable worktree é a referência do produto. DS6 está isolada e contém outro
normal/mode-controller; esta atividade é separada do refactor. Na retomada,
inspecionar os dois estados e escolher o alvo explicitamente, sem editar ambos
implicitamente nem fazer merge. Os arquivos candidatos não são autorização para
mover responsabilidades ou iniciar outra extração.

## Aceitação e testes

Relógio controlado, com testes de comportamento e identidade/visibilidade estrutural:

1. Antes de 300.000 ms nada muda; expiração ocorre uma única vez no limite.
2. Conversa ativa mantém o destino focado atual e suas garantias.
3. Status com conversa ao fundo não normaliza para Chats nem aplica foco cego.
4. Status mantido permite navegação nativa; fechar após expiração aplica foco uma vez.
5. Fechar Status ANTES da expiração não antecipa o fim do bypass.
6. Lista de Status no instante da expiração retorna ao foco.
7. Canal ativo mantém seu conteúdo/target, oculta a lateral correta e não recebe
   Buscar/Adicionar/recents por cima; conversa ao fundo não decide o destino.
8. Novo bypass/manual Foco/transição explícita invalida continuação e callbacks antigos;
   nenhum callback atrasado sequestra o destino recém-escolhido.
9. Várias mutações de DOM, marcador oculto, troca de Status e fechamento não duplicam
   timers/efeitos. Recents/coleções e expansão não são apagados.
10. Abas inativas/ocultas, fallback desconhecido e awareness mantêm os contratos
    documentados, sem novos campos ou conteúdo privado.

Executar toda a suíte Node, syntax-check dos JS afetados, parse de manifest (se
alterado), `git diff --check`. Só depois solicitar uma rota curta no Chrome:
Navigator abre Status já visto e canal escolhido; testar expiry, fechar Status,
lateral do canal e restauração em conversa. Usar relógio sintético para a matriz,
não exigir múltiplas esperas manuais de cinco minutos. Registrar evidência separada
de aceitação; testes automatizados não provam DOM real.

## Não objetivos

Bloqueio da próxima pessoa de Status; restrição de avançar conteúdos de um canal;
novo countdown/aviso obrigatório; renovação automática do bypass; alterar a barreira
de oito segundos; captura/telemetria de consumo; CSS redesign; novos menus;
retomada/conclusão de DS6; merge, release ou publicação.

## Próxima ação segura

Manter a política confirmada de documento sem foco. Fazer uma recarga de instalação,
usando depois Alt+Shift+T para testar em 10s sem novas recargas; usar o guia de evidência vinculado acima. Se falhar, reproduzir somente a superfície escolhida pelo usuário
e comparar estrutura, sem conteúdo. Não acrescentar seletores por suposição nem
retomar DS6 para corrigir esta entrega.
