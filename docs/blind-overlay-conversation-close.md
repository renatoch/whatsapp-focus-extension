# Overlay cego: desselecionar a conversa

**Status:** implementado; teste real delegado ao Navigator, conforme aprovação.
Escopo aprovado: conversas somente, sem investigação/alteração de canais.

## Contrato

Ao entrar no overlay cego, pedir fechamento nativo da conversa selecionada,
sem marcar como lida/não lida, abrir outro chat ou trocar por conversa consigo mesmo.
Ocultar visualmente não era prova de desseleção; esta revisão usa Cmd.closeChat
sobre o modelo atual, sem Cmd.markChatUnread.

Conversa focada VISÍVEL continua aberta. O envelope mantém sua ação separada
de marcar como não lida e fechar. Expiração visível/focada dos cinco minutos
preserva conversa/canal como antes; quando o destino é overlay cego, fecha a conversa.
Não intercepta recibos nem desfaz leituras/acknowledgements já enviados ou em voo.

## Retomada e controles

“Continuar conversa” foi retirado dos três locais: card principal, confirmação
normal original e confirmação normal reconstruída dinamicamente. O handler
antigo agora só aceita canal; nenhum caminho oculto retoma conversa.

Reabrir pelos recentes/busca/coleções. Fechar não reordena um recente existente.
Se a captura de uma conversa recém-aberta ainda não tiver ocorrido, conserva
seu título na memória da aba antes do fechamento, sem persistência nova.

Canais permanecem selecionados segundo o comportamento anterior, inclusive
“Continuar no canal” nos três locais. Não entram nos recentes por esta mudança.
Status e outras superfícies não ganham fechamento novo.

## Implementação limitada

- content.js: protege visualmente primeiro, solicita fechamento, mantém aviso
  persistente no card se a operação falhar. Uma nova entrada permite nova tentativa.
- Também cobre restauração nativa chegando depois do overlay de boot: observer
  existente faz uma tentativa por main montado/entrada, sem loop de retries por mutação.
- mark-unread.js: mesmo transporte de payload fixo, em canal separado
  mwf-overlay-close-v1, com ID numérico, resultado booleano/código e cancelamento.
- selected-unread-main.js: reaproveita captura canônica única e transação limitada
  em modo closeOnly. Nunca chama mark nem exige seu código disponível para fechar.
- Capacidade automática somente com overlay cego visível, root de foco compatível,
  DOM autenticado e cabeçalho de conversa validado. Não aceita alvo/ID de conversa
  nem comando arbitrário via bridge; modelos nunca cruzam mundos.
- Verifica ausência de #main, com espera limitada para commit nativo; abandona
  confirmação se alvo/modo muda, sem fechar um novo alvo em callback tardio.
- Entrada no overlay invalida grants/transações pendentes de unread. Respostas
  antigas não contaminam uma entrada nova nem restauram outra tela.
- Sem permissões, storage, telemetria ou alterações na DS6.

## Verificação

354 testes Node passaram na suíte completa. Cobertura direcionada inclui fechamento
sem acessar/chamar mark, preservação de marcador manual, guardas de overlay/auth/
canal, alvo substituído, recentes sem reordenação, captura pendente, ausência dos
três controles de conversa, continuidade de canal, proteção/aviso em falha, callback
tardio e restauração pós-boot sem loop. Expiração visível segue a rota anterior.

Não houve sessão Chrome, abertura de chats ou envio de mensagens pelo agente.
Recebimento real após fechar NÃO foi comprovado pelos testes automatizados.

## Teste curto pelo Navigator

1. Recarregar extensão e aba uma vez.
2. Abrir uma conversa e voltar ao overlay por Foco/Alt+Shift+F.
3. Confirmar ausência de “Continuar conversa” e reabertura pelos recentes.
4. Em uso, confirmar que mensagens posteriores permanecem não lidas enquanto
   o overlay está aberto, sem outro cliente lendo a mesma conversa.
5. Se o fechamento não for confirmado, deve aparecer aviso persistente; não
   assumir desseleção somente porque o conteúdo está oculto.

Nenhum envio adicional, logout, teste de canal ou nova investigação é necessário
para a entrega deste escopo. Aceitação em uso real ainda pertence ao Navigator.
