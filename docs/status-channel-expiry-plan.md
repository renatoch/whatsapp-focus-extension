# Plano adiado — Expiração focada em Status e Canais

**Estado:** backlog; plano registrado, execução adiada a pedido do Navigator.
**Autoridade atual:** documentação e preservação do acordo, não implementação,
inspeção no navegador, retomada de DS6, merge ou release.

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
**Canais ainda não foi investigado**: não assumir seletores, equivalência de DOM,
cabeçalho ou container de lateral com conversas comuns.

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

Manter no backlog. Quando o Navigator decidir retomar: ler este plano, conferir
estado real dos branches/docs e confirmar o alvo de implementação; caracterizar a
política e inspecionar Canais com sua participação. **Não implementar agora.**
