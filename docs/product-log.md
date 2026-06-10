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
- Foram adicionados botão “Buscar outra conversa” e atalhos `Alt+Shift+B` para busca e `Alt+Shift+F` para modo foco. `Esc` foi evitado porque já tem semântica útil no WhatsApp Web: desselecionar conversa, sair de arquivadas e fechar configurações.
- A ação “Continuar na conversa aberta” passou a ficar oculta quando a extensão não detecta `#main`, evitando levar o usuário para um estado vazio.
- O botão “Buscar” lateral deixou de desaparecer durante o modo busca, porque o sumiço confundia a navegação.
- Durante o carregamento inicial, a extensão mantém a tela cega, mas só libera ações quando detecta `#side`; antes disso mostra mensagem de carregamento. Isso evita clique em botões que levam para tela intermediária de loading.
- Foi adicionado botão “Lateral” e atalho `Alt+Shift+L` para mostrar/ocultar a barra lateral fora do modo busca, útil quando o usuário já está em uma conversa e quer alternar visibilidade sem abrir o fluxo de busca.
- O experimento `Rígido/Sob` foi substituído por `Oculta/Colapso`: no modo Oculta, selecionar uma conversa na busca esconde a lateral; no modo Colapso, selecionar uma conversa reduz a lateral para uma faixa estreita. O estado fica salvo em `localStorage` para permitir teste em ciclos reais.
- Primeiro teste do modo Colapso escondeu o conteúdo, mas manteve a largura inteira do painel. A implementação passou a marcar dinamicamente o ancestral lateral provável com `data-mwf-collapsed-pane` e aplicar largura reduzida também nele.
- O modo Colapso melhorou a área de mensagem, mas revelou uma linha vertical persistente; foram adicionadas regras defensivas para remover bordas/outline e mascarar o limite direito do painel.
- Quando o WhatsApp está em uma visão aninhada como Arquivadas, o campo de busca nativo pode não existir. O botão Buscar passou a tentar sair da visão aninhada via controle Back/Voltar e, como fallback, eventos `Escape`, antes de refocar a busca.

## Backlog de produto

- Busca limpa por contato sem previews.
- Whitelist de 2–3 conversas por sessão de foco.
- Atalho de teclado para voltar ao modo foco.
- Estado “sem conversa aberta” mais claro.
- Modo de foco por tema/contexto.
- Configuração de tempo da válvula de escape.
- Revisão final com especialistas de privacidade e segurança antes de qualquer distribuição pública.
