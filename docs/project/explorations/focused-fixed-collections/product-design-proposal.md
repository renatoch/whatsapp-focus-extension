# Product Design Proposal: Focused Fixed Collections

## Product Intent

Create a small private map of explicitly selected WhatsApp conversations, grouped into collapsed named collections that persist locally and reopen safely across the main list and Archived.

## User-Facing Behavior

Explorar coleções focadas fixas e nomeadas para atravessar um conjunto recorrente de conversas relacionadas sem buscar cada uma novamente e sem depender de recência ou da separação entre lista principal e Arquivadas. O MVP foi aceito: na conversa focada, “Adicionar à coleção” abre um popover compacto com coleções existentes e “Nova coleção”; a conversa atual pode ser incluída sem expor a lista geral. No overlay, coleções aparecem recolhidas por padrão, mostrando apenas nome e quantidade; somente uma coleção pode ser expandida por vez para revelar seus títulos. Clicar numa conversa reutiliza a busca nativa escondida com correspondência exata e única. O MVP permite remover conversa e apagar coleção, com limites aprovados de até 5 coleções e 8 conversas por coleção. A persistência autorizada em chrome.storage.local inclui somente nomes de coleção escritos pelo usuário e títulos exibidos das conversas explicitamente selecionadas. Permanecem excluídos mensagens, previews, termos de busca, telefones, JIDs, URLs, estado de não lida e demais dados derivados. Títulos duplicados ou renomeados devem falhar fechados e pedir nova seleção. O princípio é um pequeno mapa privado, não uma nova caixa de entrada.

## What The Product Should Feel Like

The product should preserve the exploratory shape discovered by Explorer Mode. It should show the user what is happening at the product level, not expose implementation mechanics first.

## Interaction Flow

- User works in Explorer Mode while uncertainty is still alive.
- Explorer surfaces story changes visibly.
- Explorer names attractors and proposes small experiments.
- Explorer proposes Builder handoff only when the user asks or confirms readiness.
- Builder begins only after explicit confirmation.

## Product-Level States

- Exploratory Story active.
- Attractor proposed or accepted.
- Experiment proposal proposed or accepted.
- Builder handoff proposed.

## Acceptance Behavior

- The user can understand what is being proposed without reading implementation details.
- The proposal preserves uncertainty and open questions.
- The proposal gives Builder enough product shape to create roadmap or story plans.

## Explicit Non-Goals

- This document does not define implementation architecture.
- This document does not create delivery tasks by itself.
- This document does not replace Builder planning.

## Open Product Questions

- Which behavior is necessary for the first delivery slice?
- What should remain exploratory after Builder starts?
- What user validation will prove the product behavior works?
