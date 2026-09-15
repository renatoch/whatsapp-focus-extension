# Product Log — WhatsApp Focus Mode

Este arquivo registra observações, decisões e aprendizados do MVP para alimentar uma eventual reconstrução mais robusta.

## 2026-06-09 — Protótipo 1: Blind Start

### Dor observada
Abrir o WhatsApp Web para buscar uma informação específica expõe lista de conversas, não lidas, arquivadas, badges e previews. Esses sinais geram curiosidade e desviam a intenção original.

### Princípio de design
O WhatsApp só pode te mostrar algo depois que você declarou intenção.
- Ou seja: nada de “olha aqui o que está acontecendo”. Primeiro você diz o que quer fazer; só depois a interface responde.

### Princípio de design — lateral como instrumento
A lista de conversas não é ambiente; é instrumento. Ela deve aparecer apenas quando o usuário precisa navegar.

Implicação: a lateral não precisa ser uma superfície permanente. Ela pode operar como navegação sob demanda — aparece quando convocada, desaparece quando o usuário volta para uma conversa focada.



### Funcionalidades implementadas
- Overlay inicial “Modo foco”.
- Sidebar do WhatsApp escondida por padrão via `#side`.
- Botão “Continuar na conversa aberta”.
- Botão “Ver WhatsApp normal por 5 min”, sem persistência entre recarregamentos.
- Botão “Voltar ao modo foco”.

### Aprendizados
- O botão de retorno precisa existir mesmo durante o modo normal.
- O bypass de 5 minutos não deve persistir em storage; recarregar deve voltar ao modo foco.
- `hidden` no overlay exige regra CSS explícita para vencer `display: flex`.

## 2026-06-09 — Protótipo 2: Busca nativa com menos ruído

### Hipótese
Antes de construir uma busca própria, vale testar uma etapa intermediária: abrir a busca nativa do WhatsApp com a lateral visível, mas tentando esconder previews, badges e sinais de não-lidas.

### Funcionalidades implementadas
- Botão “Buscar conversa” no overlay.
- Estado `mwf-searching`, que mostra a lateral para permitir uso da busca nativa.
- Tentativa de focar automaticamente o campo de busca do WhatsApp.
- CSS defensivo para ocultar elementos secundários, previews e badges quando possível.

### Riscos / incertezas
- O DOM do WhatsApp Web muda frequentemente.
- Seletores de preview/badge podem não cobrir todos os casos.
- Busca limpa real talvez precise de uma interface própria, com índice local de contatos/conversas permitidas.

### Observações de teste
- A busca abriu com foco no campo correto.
- Badges de não lido diminuíram, mas horário em negrito verde ainda dava pista visual.
- Previews de mensagens continuaram aparecendo no primeiro teste; os seletores foram ampliados defensivamente para tentar ocultar segunda linha, metadados e horários.
- O HTML real mostrou que o preview também usa `span[title]`; a regra passou a restaurar apenas `span[title]` dentro de `[data-testid="cell-frame-title"]`.
- Com isso, o modo busca passou a mostrar apenas o nome, sem preview e sem horário.
- O botão “Voltar ao modo foco” inicialmente cobria o botão de enviar mensagem; foi movido para o topo esquerdo e depois ajustado para `left: 280px`.
- Após print de teste, os botões ficaram visualmente intrusivos no topo; foram movidos para a barra lateral esquerda em formato vertical, no espaço entre os ícones superiores e inferiores do WhatsApp.
- Para reduzir tempo de iteração, foi criado um hot-refresh de desenvolvimento: o content script recarrega `focus.css` e `dev-config.json` a cada 1 segundo. Isso não evita reload para mudanças de JS/manifest, mas permite iterar seletores e CSS sem recarregar o WhatsApp Web.

### Implementação adicional
- Ao selecionar uma conversa no modo busca, a extensão tenta esconder automaticamente a lateral após 250ms, retornando ao estado de conversa focada.
- Foi testado um botão lateral “Buscar outra conversa” com atalho `Alt+Shift+B`, mas ele foi removido por ambiguidade: parecia abrir uma busca simples, não entrar no modo busca. A busca voltou a pertencer ao overlay de Modo Foco.
- Foi mantido o atalho `Alt+Shift+F` para modo foco. `Esc` foi evitado porque já tem semântica útil no WhatsApp Web: desselecionar conversa, sair de arquivadas e fechar configurações.
- A ação “Continuar na conversa aberta” passou a ficar oculta quando a extensão não detecta `#main`, evitando levar o usuário para um estado vazio.
- O botão “Lateral” foi mantido apenas para o modo full/manual: ele fica oculto no overlay, no modo busca e após seleção de pessoa pela busca.
- Durante o carregamento inicial, a extensão mantém a tela cega, mas só libera ações quando detecta `#side`; antes disso mostra mensagem de carregamento. Isso evita clique em botões que levam para tela intermediária de loading.
- Foi adicionado botão “Lateral” e atalho `Alt+Shift+L` para mostrar/ocultar a barra lateral apenas no modo full/manual. Ele não aparece no overlay, não aparece no modo busca e não deve funcionar via atalho no modo busca. Ao ocultar manualmente a lateral, o botão permanece visível para permitir reabrir.
- O experimento `Oculta/Colapso` foi removido após teste prático. O comportamento padrão voltou a ser: selecionar uma conversa na busca esconde a lateral.
- Quando o WhatsApp está em uma visão aninhada como Arquivadas, o campo de busca nativo pode não existir. O botão Buscar passou a tentar sair da visão aninhada via controle Back/Voltar e, como fallback, eventos `Escape`, antes de refocar a busca.
- Como o tratamento de todas as telas internas do WhatsApp ainda é incerto, quando a busca não encontra o campo nativo após uma tentativa de saída, a extensão mostra um aviso: por enquanto, modo busca só funciona na lista principal de mensagens.
- Observação de teste: o alerta não apareceu em alguns casos porque o WhatsApp podia estar em Arquivadas/Configurações ainda com elementos parecidos com busca. A tentativa de saída passou a priorizar o botão global “Conversas/Chats” da lateral esquerda antes de usar Back/Escape.
- Correção validada: ao entrar no modo busca, a extensão clica primeiro em “Conversas/Chats” quando encontra esse botão global e só depois foca a busca. Isso permite sair de Arquivadas e outras telas internas que ainda expõem um campo de busca contextual.
- “Continuar na conversa aberta” passou a tentar clicar em “Conversas/Chats” antes de esconder o overlay, para normalizar o contexto lateral quando o WhatsApp estava em Arquivadas ou outra tela interna.
- A navegação para “Conversas/Chats” foi centralizada em uma função compartilhada entre modo busca e continuar conversa, para testar se ambos os fluxos se comportam igual antes de uma refatoração maior.
- O botão “Lateral” passou a usar a mesma normalização por “Conversas/Chats” antes de ocultar a lateral, funcionando melhor quando o WhatsApp estava em Arquivadas/telas internas.
- A busca passou a ocultar resultados/lista até que o texto digitado tenha pelo menos 3 letras e mostrar um estado visual de filtragem antes da primeira exibição. Motivação: feedback de amiga apontou que ver recentes antes de uma intenção específica pode indicar mensagem nova e gerar curiosidade; após a primeira liberação, a lista permanece visível enquanto o usuário refina a busca para evitar flicker.
- Durante o carregamento inicial do WhatsApp Web, o overlay passou a manter o card de foco e substituir o aviso textual por uma barra de carregamento. Quando a barra nativa `<progress>` do WhatsApp está disponível, a extensão espelha `value`/`max`; se não encontrar, usa uma animação indeterminada como fallback.
- A válvula “Ver WhatsApp normal por 5 min” passou a ter uma pausa consciente de 8s antes de liberar o ambiente completo, com alternativas “Continuar na conversa”, “Cancelar” e “Abrir agora”. Quando não há conversa aberta, a mensagem não sugere continuar conversa e avisa que a ação abrirá a lista completa. A intenção é quebrar o impulso sem bloquear uso legítimo.
- A tela de foco passou a mostrar há quanto tempo o WhatsApp normal não é aberto, usando `localStorage` para registrar a última abertura do modo normal. Objetivo: tornar visível o padrão de reabertura por impulso/tédio.
- Se o usuário tenta abrir o WhatsApp normal novamente menos de 10 minutos após a última abertura, a confirmação troca o countdown automático por uma escolha explícita: “Abrir mesmo assim”. A mensagem destaca há quanto tempo abriu e pergunta se é impulso/tédio, evitando tom acusatório.
- Ao expirar o modo normal, uma aba visível e focada com conversa aberta passa para conversa focada e esconde apenas a lateral; aba inativa ou sem conversa retorna ao overlay cego. O destino é registrado de forma agregada para não interpretar como impulso uma reabertura causada pela própria extensão.
- A expiração focada passou a reutilizar a normalização por “Conversas/Chats” já validada pelo botão Lateral, fechando Arquivadas ou outra visão aninhada antes de aplicar a conversa focada.
- O prompt de intenção passou a permitir voltar diretamente ao modo foco sem escolher categoria. A extensão registra somente a ocorrência e a duração desse redirecionamento; “Não abrir agora” continua exigindo intenção, preservando a distinção entre retorno antes de declarar e decisão consciente após declarar. Também foi adicionada a intenção de processar pendências/não lidas e “Misto/incerto” virou “Outro / ainda não sei”.
- A opção “Fazer algo específico” foi removida da interface porque era ampla o bastante para legitimar qualquer abertura e virar escape. O identificador histórico permanece no schema e nos detalhes para preservar os eventos já coletados.

## Revisão de privacidade e segurança — análise preliminar

Uma revisão externa preliminar apontou riscos e recomendações para uma eventual versão distribuível/publicável. Não é necessário corrigir tudo no MVP local, mas estes pontos devem orientar uma reconstrução mais robusta.

### Recomendações principais

- Remover ou gatear o hot-refresh antes de qualquer distribuição pública.
- Remover `focus.css` e `dev-config.json` de `web_accessible_resources` em build final; hoje eles são úteis para desenvolvimento, mas expõem detalhes internos à página.
- Documentar explicitamente que a extensão tem acesso de leitura/escrita ao DOM do WhatsApp Web, mesmo sem backend.
- Criar uma máquina de estados mais explícita para evitar ambiguidades entre foco, busca, modo normal, lateral aberta/oculta e escape temporário.
- Adicionar debounce/guards para cliques rápidos e transições inválidas.
- Tratar fragilidade de seletores do WhatsApp Web: detecção de falha, fallback e rotina de manutenção.
- Evitar que código de desenvolvimento vá para uma versão final.
- Melhorar tratamento de erro quando a busca/campos do WhatsApp não forem encontrados.
- Avaliar persistência ou semântica do timer “Ver WhatsApp normal por 5 min”.
- Adicionar ícones, limpar manifest e documentar compatibilidade Chrome/MV3.
- Fazer nova revisão de privacidade/segurança antes de qualquer distribuição pública.

## 2026-07-01 — Experimento mobile: launcher direto para conversas

### Hipótese

No celular, talvez seja mais simples reduzir distração criando uma porta alternativa para o WhatsApp do que tentar customizar o app Android. Links diretos como `https://wa.me/<telefone>` podem abrir uma conversa específica no app, evitando entrar pela lista/home do WhatsApp.

### Protótipo criado

Foi criada uma primeira versão funcional em `mobile-conversation-launcher/`, separada da extensão Chrome. Ela é uma página/PWA local-first com busca, favoritos, cadastro manual, importação/exportação JSON e abertura direta via link `wa.me`.

### Aprendizados técnicos

- A versão standalone com CSS/JS embutidos funcionou no Android quando abrir arquivos separados via `content://` falhou.
- Links `https://wa.me/<telefone>` funcionam para abrir conversas individuais pelo WhatsApp mobile.
- Links de convite `https://chat.whatsapp.com/...` funcionam como caminho PWA para grupos, mas são sensíveis e dependem de convite ativo.
- Atalhos nativos do WhatsApp Android usam JIDs internos. Grupos aparecem no padrão `<group-id>@g.us` em `dumpsys shortcut`.
- Foi validado via ADB que o WhatsApp abre um grupo diretamente com:

```powershell
.\adb shell am start -W -n com.whatsapp/.Conversation -e jid "<group-id>@g.us"
```

Isso sugere que um app Android mínimo poderia abrir conversas/grupos por `jid`, sem depender de link de convite. O PWA não consegue disparar esse Intent com extra `jid` de forma confiável; seria necessário app Android, Tasker/MacroDroid/Automate ou outra camada nativa.

### Riscos / incertezas

- Lista de nomes e telefones é sensível; para teste, usar poucos contatos, apelidos e evitar publicar dados reais.
- PWA instalável no celular exige origem segura (`https://`) ou localhost; abrir `index.html` direto funciona como página simples, mas não como PWA completo.
- É preciso validar no Android se `wa.me` abre consistentemente a conversa desejada.
- Ainda não está decidido se contatos devem ser exportados do WhatsApp Web, cadastrados manualmente ou derivados de outra fonte.
- O caminho por Intent/JID depende de detalhes internos do WhatsApp Android e pode quebrar em atualizações.

## Aprendizado da Fase 2 — declaração de intenção

A validação agregada de 27/08 a 10/09 reuniu 418 eventos permitidos: 103 de 106 declarações terminaram em abertura, 102 foram respondidas em até cinco segundos e 95 escolheram **Ver se apareceu algo**. A pergunta produziu evidência útil, mas também virou coreografia; adicionar mais atraso mecânico não é a resposta. As reaberturas em até dez minutos caíram de 56% no recorte anterior para 26% no atual. O próximo experimento deve reduzir o custo cognitivo de navegar entre poucas conversas focadas.

## Backlog de produto

Formato: título descritivo no item principal; detalhe curto em subitem; linha em branco entre itens para facilitar leitura em dark mode.

- **[Em teste] Confirmação explícita quando WhatsApp normal foi aberto há menos de 10 min**
  - Implementação atual: se a última abertura do modo normal foi recente, não há countdown automático; a tela mostra há quanto tempo abriu e pede clique explícito em “Abrir mesmo assim”. Observar se isso quebra melhor o impulso/tédio ou se também vira gesto automático.
  - Avaliar caso específico: quando os 5 min de modo normal acabam e a extensão volta sozinha ao modo foco, faz sentido tratar como “abriu há ~5 min” e exigir confirmação explícita? Pode funcionar como estímulo para continuar na conversa focada em vez de reabrir o painel lateral, mas precisa ser validado em uso real.

- **[Em teste] Reduzir a espera para revelar resultados da busca**
  - `SEARCH_SETTLE_MS` foi reduzido de 2000ms para 1000ms. Validar se a busca ficou leve sem deixar a lista de recentes aparecer antes de o filtro nativo estabilizar.

- **[Próximo experimento] Sugerir ação focada conforme a intenção declarada**
  - Depois de escolher uma intenção, oferecer primeiro o caminho focado correspondente — busca, conversa aberta ou futuro lote de pendências — e manter o modo geral como alternativa. Projetar como fricção contextual, sem poluir a tela inicial nem adicionar outro atraso mecânico.

- **[Ideia fraca / decisão pendente] Buscar por nome preservando estado de não lida**
  - Em casos com múltiplos contatos ou grupos de nomes semelhantes, mostrar um marcador neutro de não lida antes de abrir pode evitar ciclos de abrir, conferir, remarcar e buscar novamente. Decisão pendente: mostrar todos os resultados com indicador ou oferecer filtro **Somente não lidas**. Não implementar sem nova evidência.

- **[Próximo ajuste] Replicar filtro de não lidas dentro de Arquivadas**
  - O chat principal já tem botão nativo para filtrar conversas não lidas. Ideia: oferecer comportamento equivalente em Arquivadas, para achar não lidas arquivadas sem varrer a lista inteira.

- **[Alternativa futura] Fixar explicitamente conversas buscadas**
  - A fixação manual permanece como possível evolução híbrida caso a lista automática não preserve uma conversa pelo tempo necessário. Não priorizar antes de validar o conjunto recente por sessão.

- **[Validado] Acessar as 3–4 conversas abertas recentemente pelo modo foco**
  - O protótipo mantém até 4 títulos únicos apenas na memória da aba, capturados depois de uma busca focada. A lista aparece no overlay e na conversa focada; reabrir usa busca nativa visualmente escondida e só seleciona um resultado de título exato e inequívoco. Títulos não entram em storage, awareness, logs ou exports. Na primeira validação, esconder a lateral com `visibility: hidden` impediu o campo nativo de receber foco; trocar para `opacity: 0` não resolveu sozinho. O diagnóstico mostrou que campo, texto e correspondência exata funcionavam, mas `HTMLElement.click()` não ativava o resultado (`headerMatched: false`). Inspeção direta e sem conteúdo via Chrome DevTools Protocol encontrou o handler React `onMouseDown` no `cell-frame-container`; um experimento estrutural controlado com `mousedown` abriu a conversa e confirmou o cabeçalho. A implementação agora reproduz exatamente esse evento evidenciado. Depois da primeira abertura funcional, a espera fixa de 1,4 s foi substituída por sondagem segura a cada 150 ms, preservando o limite e a falha fechada. A busca manual agora limpa o termo usado pela navegação interna antes de abrir, e o novo componente nativo `recent-search-item` é ocultado enquanto há menos de três caracteres. O diagnóstico copiável permanece restrito a etapas, booleanos e contagens.

- **[Em validação] Recentes pelas últimas aberturas, não somente pela busca**
  - Experimento aprovado: até 5 títulos únicos na memória da aba, atualizados por abertura deliberada no modo completo, busca, coleção, recentes ou **Continuar conversa**. O caso observado era precisar buscar novamente alguém já aberto no modo completo só para incluí-lo nos recentes. Recentes são efêmeros; coleções oferecem consistência explícita.
  - A seleção nativa por clique ou Enter é confirmada pelo cabeçalho, com tentativas limitadas e cancelamento de captura ultrapassada. Recebimento de mensagens e mudanças passivas do DOM não alimentam a lista. Aberturas fora da busca não são classificadas como busca no awareness; nenhum título entra em persistência ou telemetria.
  - 58 testes automatizados passam. Falta validar no Chrome: abrir uma conversa no modo completo, retornar à superfície focada e retomá-la sem buscar; abrir uma sexta conversa e confirmar que a mais antiga sai. Observar se a rotatividade dos cinco itens atende ao uso real. O Navigator confirmou que **Continuar conversa** funciona bem e que os recentes parecem funcionar, mantendo a avaliação de utilidade em uso.

- **[Em implementação] Coleções focadas fixas**
  - Até 5 coleções de 10 conversas, adicionadas explicitamente e recolhidas por padrão na própria tela de conversa focada. A primeira implementação as colocou no overlay para tratá-las como um mapa separado, mas isso exigia sair da conversa antes de alternar e contrariava o objetivo ergonômico. Elas agora compartilham a superfície lateral das conversas recentes, permitindo alternância direta. A extensão persiste em `chrome.storage.local` somente o nome escrito da coleção e os títulos escolhidos, reutiliza a navegação exata escondida e mantém recência, não lidas, previews e demais dados fora do modelo.

- **[Validado] Preservar continuidade ao navegar pela coleção**
  - Abrir um membro não recolhe mais a coleção nem esconde a seção durante a busca interna. O render mantém os nós da coleção quando seu conteúdo/expansão não mudou, preservando a rolagem da superfície compartilhada. Uma segunda abertura enquanto a anterior está em andamento é ignorada. Recolhimento continua explícito (inclusive ao expandir outra coleção) ou após reload; nenhuma expansão é persistida. Falha de navegação continua usando a recuperação segura existente. Navigator confirmou as trocas sequenciais no Chrome; o deslocamento causado pelo crescimento dos recentes foi resolvido no ajuste complementar abaixo.

- **[Validado] Reservar altura dos cinco recentes para não deslocar coleções**
  - Navigator confirmou a continuidade de expansão, mas a coleção ainda descia ao incluir um recente quando havia menos de cinco. A superfície focada agora reserva altura fixa para cinco linhas, inclusive quando vazia, mantendo o espaçamento antes das coleções. O overlay não ganha essa reserva. Há espaço vazio intencional até completar os cinco itens. Teste de contrato CSS cobre dimensões e lista vazia; 63 testes passam. Navigator confirmou no Chrome: “Ficou ótimo, pode concluir”. Ajuste concluído, sem encerrar por inferência toda a DS5.

- **[Validado] Exibir navegação focada ao continuar conversa**
  - **Continuar conversa** agora aplica o mesmo estado focado usado após a busca, mostrando recentes e coleções disponíveis. Preserva a normalização por Conversas/Chats, a limpeza das confirmações pendentes e a captura do título sem classificá-la como busca no awareness. Teste automatizado verifica a sequência compartilhada; Navigator confirmou a exibição correta no Chrome. Mostrar opções antes de selecionar um resultado de busca continua sendo uma decisão separada.

- **[Em validação] Escolher conversas na busca vazia**
  - Navigator aprovou testar a primeira alternativa: ao entrar em **Buscar**, campo vazio mostra os cinco recentes e as coleções inicialmente recolhidas, mesmo sem conversa aberta. Digitar esconde essa navegação; limpar o campo a recupera. Sem opções salvas, permanece a orientação de busca. A busca nativa continua escondendo sugestões/lista antes de três caracteres e esperando um segundo para a revelação inicial. Nenhum preview ou sinal de não lida é adicionado.
  - Reutiliza a superfície de navegação e a abertura exata existentes, sem alterar persistência. Enter nos controles da extensão não dispara seleção nativa. 68 testes passam; validar no Chrome a entrada vazia, clique direto, digitar/limpar e se os nomes conhecidos ajudam ou distraem. Caso distraiam, alternativa futura: botão explícito para revelar recentes/coleções.

- **[Em validação] Isolar navegação da interface nativa na busca vazia**
  - As telas mostraram filtros, sugestões e rodapé nativos disputando espaço com a seção. A correção mantém a posição/altura da navegação, usa fundo opaco e oculta ramos irmãos do campo de busca dentro de `#side`, preservando a linha de busca e headers sem remover elementos do layout. Novos ramos inseridos pelo WhatsApp são reavaliados pelo observador existente. A ocultação só vale enquanto a busca vazia oferece opções; digitar ou iniciar abertura interna desativa essa regra. São apenas marcadores estruturais no DOM, sem conteúdo nem persistência. 70 testes passam; confirmar no Chrome a linha de pesquisa/controles, ausência de sobreposição e retorno dos resultados ao digitar.

- **[Validado] Aguardar estabilização de correspondências na abertura exata**
  - Navigator encontrou duas correspondências exatas na primeira tentativa e sucesso ao repetir pela conversa focada. O diagnóstico confirmou ausência de clique; duplicação transitória é hipótese, não causa comprovada. A navegação agora sonda também ambiguidades, mantendo o limite de 11 observações, e só ativa um alvo exato único confirmado em duas sondagens consecutivas (150 ms entre elas), com o termo nativo aceito. Ausência, ambiguidade, mudança de alvo ou termo incorreto interrompem a sequência estável. Duplicidade persistente continua falhando fechada.
  - Diagnóstico copiável adiciona `resultSamples`: até 12 amostras sanitizadas com índice da tentativa, contagens de linhas/títulos/correspondências e booleano de aceitação do termo. Nenhum nome, termo, conteúdo ou DOM entra no diagnóstico. A espera extra mínima é 150 ms, sem aumentar o limite de tentativas. 77 testes passam, incluindo duplicidade transitória/persistente, resultado único transitório, alvo substituído, cancelamento e sanitização. Navigator confirmou: “Agora estabilizou. Pode concluir esse”. Ajuste aceito; a causa original permanece hipótese, sem necessidade de novas tentativas ou mudanças de seletores.

- **[Exploração] Consultar não lidas de uma coleção sob demanda**
  - Necessidade confirmada: saber quais conversas da coleção têm não lidas somente quando o usuário pedir, não sempre que a coleção aparecer ou for expandida. Consultar o estado nativo, sem filtrar por autor, sem previews e sem persistir estado de não lida. A viabilidade de consultar sem abrir cada conversa e sem alterar leitura/arquivamento ainda precisa ser investigada. Não implementar como parte implícita da DS5 nem confundir com o atalho nativo de marcar como não lida.

- **[Implementado] Ampliar capacidade de membros por coleção para 10**
  - Navigator aprovou dez membros porque o caso original excede oito. Limite, mensagem e teste de sanitização/reload atualizados; cinco coleções continuam permitidas. Sem mudança de schema ou de privacidade. A ampliação é independente da consulta de não lidas; não encerra por si só a validação agregada da DS5.

- **[Em validação] Ocultar recentes durante declaração e confirmação de modo completo**
  - O overlay acumulava navegação e decisão, deixando as justificativas visualmente poluídas. Os recentes agora ficam ocultos somente enquanto a declaração de intenção ou a confirmação do modo completo estiver ativa. Ao voltar ao foco, a mesma lista reaparece; nenhum título é removido nem o contador é alterado. Correção CSS pontual na `main`, com testes de contrato para ambos os estados, a incorporar também no worktree DS6 sem retomar o refactor.

- **[Experimento futuro] Testar abertura sem o contador de oito segundos**
  - A barreira já mostrou sinais de coreografia, mas isso não prova que retirá-la melhora o uso. Proposta para depois: testar sem a espera de oito segundos, mantendo inicialmente declaração de intenção, opções de não abrir/voltar ao foco, janela de cinco minutos e retorno automático. Observar se reduz burocracia ou aumenta aberturas automáticas; não presumir que a declaração deva permanecer para sempre. Definir separadamente como fica a confirmação de uso recente antes do experimento. Nenhuma remoção do contador foi autorizada ou implementada neste ajuste visual.

- **[Em teste] Contador de tempo sem abrir WhatsApp normal ajuda ou vira ruído?**
  - Implementação atual: a tela de foco mostra tempo desde a última abertura do modo normal. Observar se aumenta consciência de reabertura impulsiva/tédio ou se passa a ser ignorado. Variação futura: separar “tempo sem abrir geral” de “tempo sem qualquer ação no WhatsApp”.

- **[Ideia/Próximo ajuste] Contar quantas vezes o WhatsApp normal foi aberto no dia e na semana**
  - Complementar o tempo desde a última abertura com volume de reaberturas: “abriu WhatsApp normal X vezes hoje” e talvez “Y vezes nesta semana”. Objetivo: tornar visível o padrão cumulativo de escape, não só o intervalo desde a última vez.

- **[Ideia/Próximo ajuste] Marcar conversa focada como não lida e sair sem abrir o modo full**
  - Quando estiver em modo de ver apenas a conversa, permitir marcar a conversa atual como não lida e sair dela mantendo esse estado, sem precisar voltar para o WhatsApp normal/lista completa.

- **[Ideia/Exploração] Sumarizar conversas do dia anterior para entender temas e foco**
  - Gerar uma visão das conversas em que houve mensagem enviada no dia anterior — e talvez também conversas lidas, incluindo mensagens antigas que não estavam marcadas como não lidas — para perceber quais temas ocuparam atenção e como o tempo ficou pulverizado entre conversas. Incluir contador de quantas conversas privadas e de grupo tiveram mensagem enviada no dia; para grupos, se possível registrar/estimar quantidade de participantes para diferenciar grupos grandes e pequenos. Em cada conversa, registrar também a quantidade de mensagens do dia, tanto em grupos quanto em conversas individuais.

- **[Experimento técnico] Validar launcher Android nativo por Intent/JID**
  - Próximo passo além do PWA: criar app Android mínimo, ou testar via Tasker/MacroDroid/Automate, que abra `com.whatsapp/.Conversation` com extra `jid`. Objetivo: abrir grupos diretamente por JID (`...@g.us`) sem depender de link de convite, e talvez abrir pessoas por `...@s.whatsapp.net`. Validar fragilidade, permissões e compatibilidade antes de investir.

- **[Ideia/Exploração] Aguardar resposta sem checar repetidamente o WhatsApp**
  - Caso de uso: depois de mandar mensagem para uma pessoa específica, o usuário fica esperando resposta e entra várias vezes no WhatsApp para checar, porque notificações gerais estão desligadas. Explorar se a extensão pode monitorar aquela conversa em intervalo definido e avisar quando houver resposta, ou se é melhor orientar/configurar uma notificação específica para aquela pessoa/conversa sem reativar notificações gerais.

- **[Configuração] Permitir desligar funcionalidades e ajustar parâmetros sensíveis**
  - Exemplos: delays intencionais, duração do “Ver WhatsApp normal”, mínimo de letras antes de mostrar busca, e outros ajustes que dependem da sensibilidade do usuário.

- **[Dev ergonomics] Recarregar extensão e aba automaticamente durante desenvolvimento**
  - Estudar script/perfil Chrome separado com `--remote-debugging-port` para evitar abrir manualmente `chrome://extensions` a cada mudança de `content.js`.

- **[Hardening] Revisar recomendações de privacidade e segurança antes de distribuição pública**
  - Recomendações principais estão registradas acima; versão completa está salva na memória `37b21a40` — “Análise completa de privacidade e segurança — WhatsApp Focus Mode (HTML)”.

- **[Hardening] Fazer revisão final com especialistas antes de distribuição pública**
  - Rodada final de privacidade e segurança antes de recomendar instalação pública.
