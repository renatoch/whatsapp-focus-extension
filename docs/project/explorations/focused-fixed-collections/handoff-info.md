# Handoff Info: Focused Fixed Collections

## Handoff Summary

Create a small private map of explicitly selected WhatsApp conversations, grouped into collapsed named collections that persist locally and reopen safely across the main list and Archived.

## Handoff Completeness Checklist

- [x] continuous exploratory thickening
- [ ] source evidence list
- [x] surfaces and story state
- [x] phases or evolution narrative
- [ ] examples or simulations
- [x] product decisions
- [ ] user conversation flows
- [x] transition rules
- [x] risks
- [x] boundaries
- [x] open questions
- [x] what Builder should preserve
- [x] what Builder should not assume

Missing or weak evidence before Builder should treat this as complete:
- source evidence list
- examples or simulations
- user conversation flows

## What Builder Should Preserve

- The exploration is not only a feature request. It carries discovery context and product judgment.
- The attractor and experiment proposal should guide Builder's first roadmap framing.
- The product design proposal should be translated into roadmap/story docs only after Builder reads the project.

## Risks

- Builder may over-treat exploratory material as settled delivery scope.
- Builder may flatten open questions into implementation assumptions.
- Builder may focus on mechanism before preserving the user-facing product shape.

## Open Questions

- Which parts of this exploration should become roadmap stories?
- What validation route proves the product behavior externally?
- What should remain outside the first delivery slice?

## Boundaries

- This handoff is not a delivery plan.
- Builder must still read the project, create or update roadmap/story docs, and validate with the Navigator.
- Explorer preserved uncertainty; Builder should not erase it prematurely.

## Non-Assumptions

- Do not assume implementation architecture from this handoff.
- Do not assume all open questions are in scope.
- Do not assume the experiment proposal has already been validated.

## Attractors

- **Um pequeno mapa privado, não uma nova caixa de entrada** (`proposed`)
  - Coleções recolhidas organizam somente conversas escolhidas explicitamente. Elas atravessam principal e Arquivadas, revelam membros apenas sob ação e reutilizam navegação exata segura, sem importar atividade, não lidas ou conteúdo do WhatsApp.

## Experiment Status

**Uma coleção Casa atravessando principal e Arquivadas** (`proposed`)

Construir localmente o menor fluxo completo: criar Casa a partir de uma conversa focada, adicionar conversas da lista principal e de Arquivadas, recarregar a aba para confirmar persistência, expandir a coleção sob ação explícita, alternar pelas conversas usando correspondência exata, remover um membro e apagar a coleção. Passa se reduz buscas repetidas sem revelar lista geral, mantém coleções recolhidas por padrão e não persiste nada além dos nomes de coleção e títulos escolhidos. Falha ou pede nova seleção diante de título ausente, renomeado ou duplicado.

## Promotion Boundary

Builder executes only after explicit confirmation from the Navigator.
