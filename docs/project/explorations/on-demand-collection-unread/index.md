# Consulta temporária de não lidas nas coleções

**Status:** backlog — definições registradas; implementação não autorizada.
**Jornada:** extensao-chrome-foco-whatsapp-web.
**Origem:** exploração “Consulta temporária de pendências nas coleções”.

## Necessidade concreta

Antes de contatar alguém sobre um trabalho específico, conferir se há mensagens
não lidas nos grupos/DMs da coleção: talvez já exista contexto relevante ali.
Não exigir modo completo nem abrir cada conversa, pois abrir altera seu estado
de leitura. A consulta indica onde conferir, não se determinada pessoa respondeu.

O objetivo é apoiar uma ação escolhida, não criar um painel de novidades que
convide a verificações recorrentes. A disponibilidade técnica de contadores não
justifica badges permanentes ou monitoramento contínuo.

## Definições alcançadas

- Consulta exclusivamente por clique explícito, restrita à coleção escolhida.
- Controle neutro, sem contagem, cor de novidade ou badge antes de consultar.
  “Consultar não lidas” é uma possibilidade de rótulo, ainda não uma decisão visual.
- Revelar brevemente uma fotografia do estado nativo; esconder novamente.
- Não atualizar os resultados ao vivo enquanto aparecem nem deixar sinais depois.
- Não abrir chats, emitir recibos, marcar como lida/não lida ou alterar arquivamento.
- Não abrir modo completo nem iniciar/renovar sua janela de cinco minutos.
- Sem previews, leitura de conteúdo, filtro por autor ou identificação de quem respondeu.
- Sem soma de mensagens no cabeçalho; usar resumo qualitativo da coleção.

### Linguagem dos indicadores

Os glifos abaixo representam a semântica acordada; o desenho final pode ser
ajustado sem mudar o significado.

| Estado nativo | Item da conversa | Cabeçalho da coleção durante a consulta |
|---|---|---|
| Há mensagens não lidas | Quantidade, por exemplo **3** | **●** — há mensagens não lidas |
| Há apenas marcação manual | **○** — marcada como não lida | **○** — somente marcações manuais |
| Nenhuma não lida | Sem marca | **—** — consultado e sem não lidas |

Se houver mensagens em alguns membros e marcações manuais em outros, o cabeçalho
prioriza **●**; os itens mantêm a distinção. O cabeçalho segue a precedência dos
estados individuais, mas não apresenta soma nem número de conversas.

**—** só aparece durante uma consulta concluída, distinguindo ausência confirmada
de “não consultei”. Indisponibilidade, membro ambíguo ou falha não significam zero:
não afirmar ausência completa quando algum membro não pôde ser resolvido.

“Não lidas” é o estado atual do WhatsApp, não “chegaram desde a última consulta”.
Não introduzir histórico de consultas, comparações temporais ou contadores próprios.

### Marcação manual e mensagens recebidas

Evidência técnica anterior: contagem positiva indica mensagens não lidas; valor
negativo representa marcação manual. Renato esclareceu que receber mensagens em
uma conversa marcada manualmente faz o WhatsApp exibir a quantidade de mensagens
não lidas. Preservar a precedência nativa; **não abrir uma investigação/teste de
conta adicional para redescobrir esse comportamento já esclarecido**.

## Base técnica e limite ainda aberto

As investigações recentes comprovaram acesso aos modelos lógicos e aos metadados
nativos de não lida sem rolar a lista ou abrir chats:
[Arquivadas](../../../archived-unread-filter-investigation.md) e
[modelo selecionado](../../../selected-chat-unread-investigation.md).

Isso não resolve automaticamente a associação entre cada título salvo na coleção
e seu modelo nativo. A coleção persiste nomes escolhidos, não JIDs/telefones/IDs.
Resolver identidade de forma única, sem escolher o primeiro homônimo, sem busca
que abra conversas e sem adicionar identificadores persistentes. Renomeados,
ausentes ou ambíguos precisam de estado indisponível, não contagem atribuída a outro.

A implementação futura deve preferir leitura local de metadados já carregados,
com dados transitórios, limites e falha segura. Nenhum conteúdo, título, identificador,
estado derivado ou contagem deve virar telemetria ou novo armazenamento persistente.
Não reutilizar os comandos mutáveis de marcar/fechar para uma consulta somente leitura.

## Pontos a decidir na implementação futura

- Duração da revelação e se haverá ação explícita para esconder antes do prazo.
- Descarte ao recolher/trocar coleção, navegar, ocultar aba ou trocar modo.
- Comportamento de novo clique durante a revelação: esconder ou consultar novamente.
- Desenho acessível dos símbolos e apresentação de consulta parcial/indisponível.
- Rota mínima para associar títulos e modelos com segurança.

Esses detalhes não autorizam ampliar a exploração para monitoramento ou adicionar
barreiras de uso sem necessidade. O risco de ritual de checagem permanece uma
hipótese de produto, a observar no uso, não razão para impor fricção antecipadamente.

## Critérios para uma futura implementação

1. Antes do clique e após esconder, não há sinal persistente de novidade.
2. Uma consulta exibe somente os membros da coleção escolhida e seu resumo.
3. Quantidade, marcação manual, ausência e indisponibilidade não se confundem.
4. Resultado é uma fotografia: chegada posterior não anima nem atualiza a superfície.
5. Consulta não abre chats nem altera leitura, seleção, arquivamento ou prazo normal.
6. Não depende de rolar a lista nativa, revelar a lateral ou percorrer chats por abertura.
7. Metadados da consulta são descartados; persistência atual das coleções é preservada.

Somente captura documental. Não é plano aprovado, seleção de Delivery Story,
implementação, validação, alteração da DS5/DS6 ou autorização de release.
