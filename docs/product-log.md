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
- A busca passou a ocultar resultados/lista até que o texto digitado tenha pelo menos 3 letras e mostrar um estado visual de filtragem antes da primeira exibição. Motivação: feedback de amiga apontou que ver recentes antes de uma intenção específica pode indicar mensagem nova e gerar curiosidade; após a primeira liberação, a lista permanece visível enquanto o usuário refina a busca para evitar flicker.
- Durante o carregamento inicial do WhatsApp Web, o overlay passou a manter o card de foco e substituir o aviso textual por uma barra de carregamento. Quando a barra nativa `<progress>` do WhatsApp está disponível, a extensão espelha `value`/`max`; se não encontrar, usa uma animação indeterminada como fallback.
- A válvula “Ver WhatsApp normal por 5 min” passou a ter uma pausa consciente de 5s antes de liberar o ambiente completo, com alternativas “Continuar na conversa”, “Cancelar” e “Abrir agora”. A intenção é quebrar o impulso sem bloquear uso legítimo.

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

## Backlog de produto

- Estudar configurações e toggles: permitir desativar funcionalidades e ajustar parâmetros quando fizer sentido, como delays intencionais para usuários mais sensíveis e duração do “Ver WhatsApp normal”.
- Validar em uso real a pausa consciente antes de “Ver WhatsApp normal por 5 min”: se 5s é adequado, se “Continuar na conversa” reduz abertura desnecessária da lista e se “Abrir agora” evita frustração quando o uso é legítimo.
- Ajustar botão “Lateral” para funcionar fora da lista principal: hoje ele só oculta corretamente se o WhatsApp estiver na lista principal; se estiver em Arquivadas/telas internas, não faz nada. Deve usar o mesmo tratamento de normalização de “Conversas/Chats” usado por Buscar e Continuar na conversa.
- Testar forma clara de “buscar outra conversa” sem precisar voltar pelo fluxo Foco → Busca. Contexto: o botão lateral “Busca” surgiu para esse caso, mas ficou ambíguo. Experimento atual: botão “Buscar” no topo da área/lateral ocultada após selecionar uma conversa via modo busca; ele só aparece nesse estado pós-busca e some ao sair dele.
- Revisão futura das recomendações de privacidade/segurança registradas acima. A versão completa em HTML/rich text está salva no banco da jornada como memória `37b21a40` — “Análise completa de privacidade e segurança — WhatsApp Focus Mode (HTML)”.
- Busca limpa por contato sem previews.
- Whitelist de 2–3 conversas por sessão de foco.
- Atalho de teclado para voltar ao modo foco.
- Estado “sem conversa aberta” mais claro.
- Modo de foco por tema/contexto.
- Configuração de tempo da válvula de escape.
- Revisão final com especialistas de privacidade e segurança antes de qualquer distribuição pública.
