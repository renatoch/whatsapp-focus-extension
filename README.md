# WhatsApp Focus Mode

Protótipo local de extensão Chrome para abrir o WhatsApp Web em modo cego.

## Como documentar o MVP

- `README.md`: uso atual, instalação, teste e limitações práticas.
- `docs/product-log.md`: dores observadas, decisões de design, aprendizados e backlog para uma futura reconstrução.

## Objetivo do Protótipo 1

Reduzir captura atencional ao abrir `web.whatsapp.com`:

- esconde o painel lateral (`#side`) por padrão;
- mostra uma tela neutra de **Modo foco**;
- inclui uma primeira opção **Buscar conversa**, que abre a busca nativa com tentativa de reduzir previews/badges;
- ao escolher uma conversa no modo busca, volta automaticamente para conversa focada com a lateral escondida;
- permite continuar apenas na conversa aberta, ocultando o overlay e mantendo a lateral escondida;
- oculta a ação **Continuar na conversa aberta** quando não detecta conversa aberta;
- durante o carregamento inicial do WhatsApp Web, mantém a tela cega e exibe estado de carregamento sem ações clicáveis;
- oferece uma válvula de escape: **Ver WhatsApp normal por 5 min**;
- adiciona botão vertical **Voltar ao modo foco** na barra lateral esquerda, para não cobrir conteúdo da conversa;
- adiciona botão vertical **Buscar outra conversa** na barra lateral esquerda quando uma conversa está focada, mantendo-o visível também durante a busca;
- adiciona botão **Lateral** para mostrar/ocultar a barra lateral sem entrar no modo busca;
- adiciona botão de experimento **Oculta/Colapso** para alternar entre esconder a lateral após seleção ou mantê-la reduzida;
- adiciona atalhos `Alt+Shift+F` para voltar ao modo foco, `Alt+Shift+B` para buscar conversa e `Alt+Shift+L` para mostrar/ocultar lateral;
- recarregar a página sempre volta ao modo foco, sem esperar os 5 minutos.

A busca limpa própria ainda não existe. O protótipo atual usa a busca nativa do WhatsApp em um estado intermediário de menor ruído.

## Como instalar localmente no Chrome

1. Abra `chrome://extensions`.
2. Ative **Developer mode** / **Modo do desenvolvedor**.
3. Clique em **Load unpacked** / **Carregar sem compactação**.
4. Selecione esta pasta:

   ```text
   /path/to/whatsapp-focus-extension
   ```

5. Abra ou recarregue `https://web.whatsapp.com`.

## Desenvolvimento sem recarregar a aba toda

A extensão tem um pequeno hot-refresh de desenvolvimento.

Depois de uma recarga única da extensão e da aba, o `content.js` passa a buscar a cada 1 segundo:

- `focus.css`
- `dev-config.json`

Isso permite ajustar CSS, posição do botão e seletores de ocultação sem recarregar o WhatsApp Web.

Ainda precisa recarregar quando mudar:

- `manifest.json`;
- `content.js`;
- permissões;
- arquivos novos não declarados em `web_accessible_resources`.

Para ajustes de ruído visual, prefira editar `dev-config.json`.

## Como testar

1. Ao abrir WhatsApp Web, a tela deve mostrar apenas **Modo foco**.
2. O painel lateral de conversas não deve aparecer.
3. Clique em **Buscar conversa**.
4. A lateral deve aparecer para permitir a busca nativa, com menos previews/badges quando os seletores funcionarem.
5. Selecione uma conversa; a lateral deve sumir automaticamente depois da seleção.
6. Clique em **Buscar outra conversa**; a busca deve abrir novamente sem passar pelo overlay.
7. Clique em **Voltar ao modo foco** para retornar à tela neutra.
8. Teste `Alt+Shift+B` para buscar conversa, `Alt+Shift+F` para voltar ao modo foco e `Alt+Shift+L` para mostrar/ocultar a lateral.
9. Alterne o botão **Oculta/Colapso** e compare o comportamento após selecionar uma conversa na busca.
9. Clique em **Continuar na conversa aberta**.
10. A conversa, se houver uma aberta, fica visível; a lateral continua escondida.
11. Clique em **Ver WhatsApp normal por 5 min** para validar a válvula de escape.
12. Durante o modo normal, clique em **Voltar ao modo foco** para encerrar a liberação antes dos 5 minutos.
13. Recarregue a página e confirme que ela volta ao modo foco imediatamente.

## Limitações conhecidas

- O seletor principal da lateral é `#side`, que pode mudar se o WhatsApp alterar o DOM.
- A busca limpa própria ainda não existe; o estado “Buscar conversa” usa a busca nativa do WhatsApp com redução visual parcial.
- Se nenhuma conversa estiver aberta, o botão “Continuar na conversa aberta” pode deixar uma área vazia — isso é aceitável neste v0.
- O overlay usa `hidden`; há uma regra CSS explícita para impedir que o estilo `display: flex` sobrescreva o estado oculto.
