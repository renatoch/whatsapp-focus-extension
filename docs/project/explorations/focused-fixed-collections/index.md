# Exploration Handoff: Focused Fixed Collections

## Editorial Synthesis

The product should reduce repeated search without recreating the general inbox. The MVP offers Add to collection from a focused conversation, creation or selection through a compact popover, up to five collections with eight conversations each, collapsed collection rows showing only name and count, at most one expanded collection, exact hidden-search reopening, member removal, and collection deletion. Persist only user-authored collection names and explicitly selected WhatsApp display titles in chrome.storage.local. Never persist messages, previews, search terms, phones, JIDs, URLs, unread state, or other derived data. Duplicate, missing, or renamed titles fail closed and ask for reselection. Validate with one collection spanning main and Archived, persistence after reload, safe switching, removal, deletion, and privacy inspection. Keep native mark-unread work outside this delivery.

## Durable Story

- Story id: `c3e9a274`
- Journey: `extensao-chrome-foco-whatsapp-web`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Explorar coleções focadas fixas e nomeadas para atravessar um conjunto recorrente de conversas relacionadas sem buscar cada uma novamente e sem depender de recência ou da separação entre lista principal e Arquivadas. O MVP foi aceito: na conversa focada, “Adicionar à coleção” abre um popover compacto com coleções existentes e “Nova coleção”; a conversa atual pode ser incluída sem expor a lista geral. No overlay, coleções aparecem recolhidas por padrão, mostrando apenas nome e quantidade; somente uma coleção pode ser expandida por vez para revelar seus títulos. Clicar numa conversa reutiliza a busca nativa escondida com correspondência exata e única. O MVP permite remover conversa e apagar coleção, com limites aprovados de até 5 coleções e 8 conversas por coleção. A persistência autorizada em chrome.storage.local inclui somente nomes de coleção escritos pelo usuário e títulos exibidos das conversas explicitamente selecionadas. Permanecem excluídos mensagens, previews, termos de busca, telefones, JIDs, URLs, estado de não lida e demais dados derivados. Títulos duplicados ou renomeados devem falhar fechados e pedir nova seleção. O princípio é um pequeno mapa privado, não uma nova caixa de entrada.

MVP fechado: adicionar a partir da conversa por popover; até 5 coleções de 8 conversas; coleções recolhidas com nome e quantidade; uma expandida por vez; persistência local limitada a nomes e títulos autorizados; abertura exata e segura através de principal e Arquivadas.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

- **Um pequeno mapa privado, não uma nova caixa de entrada** (`proposed`)
  - Coleções recolhidas organizam somente conversas escolhidas explicitamente. Elas atravessam principal e Arquivadas, revelam membros apenas sob ação e reutilizam navegação exata segura, sem importar atividade, não lidas ou conteúdo do WhatsApp.

## Current Experiment Proposal

**Uma coleção Casa atravessando principal e Arquivadas** (`proposed`)

Construir localmente o menor fluxo completo: criar Casa a partir de uma conversa focada, adicionar conversas da lista principal e de Arquivadas, recarregar a aba para confirmar persistência, expandir a coleção sob ação explícita, alternar pelas conversas usando correspondência exata, remover um membro e apagar a coleção. Passa se reduz buscas repetidas sem revelar lista geral, mantém coleções recolhidas por padrão e não persiste nada além dos nomes de coleção e títulos escolhidos. Falha ou pede nova seleção diante de título ausente, renomeado ou duplicado.

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
