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

## Backlog de produto

Formato: título descritivo no item principal; detalhe curto em subitem; linha em branco entre itens para facilitar leitura em dark mode.

- **[Em teste] Confirmação explícita quando WhatsApp normal foi aberto há menos de 10 min**
  - Implementação atual: se a última abertura do modo normal foi recente, não há countdown automático; a tela mostra há quanto tempo abriu e pede clique explícito em “Abrir mesmo assim”. Observar se isso quebra melhor o impulso/tédio ou se também vira gesto automático.
  - Avaliar caso específico: quando os 5 min de modo normal acabam e a extensão volta sozinha ao modo foco, faz sentido tratar como “abriu há ~5 min” e exigir confirmação explícita? Pode funcionar como estímulo para continuar na conversa focada em vez de reabrir o painel lateral, mas precisa ser validado em uso real.

- **[Próximo ajuste] Replicar filtro de não lidas dentro de Arquivadas**
  - O chat principal já tem botão nativo para filtrar conversas não lidas. Ideia: oferecer comportamento equivalente em Arquivadas, para achar não lidas arquivadas sem varrer a lista inteira.

- **[Ideia/Próximo ajuste] Fixar conversas buscadas para manter 2–3 conversas acessíveis**
  - Permitir fixar conversas encontradas pela busca, nem que seja por período ou critério de desfazer/desfixar. Objetivo: trabalhar com poucas conversas simultâneas sem precisar buscar novamente e sem reabrir a lista geral.

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

- **[Configuração] Permitir desligar funcionalidades e ajustar parâmetros sensíveis**
  - Exemplos: delays intencionais, duração do “Ver WhatsApp normal”, mínimo de letras antes de mostrar busca, e outros ajustes que dependem da sensibilidade do usuário.

- **[Dev ergonomics] Recarregar extensão e aba automaticamente durante desenvolvimento**
  - Estudar script/perfil Chrome separado com `--remote-debugging-port` para evitar abrir manualmente `chrome://extensions` a cada mudança de `content.js`.

- **[Hardening] Revisar recomendações de privacidade e segurança antes de distribuição pública**
  - Recomendações principais estão registradas acima; versão completa está salva na memória `37b21a40` — “Análise completa de privacidade e segurança — WhatsApp Focus Mode (HTML)”.

- **[Hardening] Fazer revisão final com especialistas antes de distribuição pública**
  - Rodada final de privacidade e segurança antes de recomendar instalação pública.
