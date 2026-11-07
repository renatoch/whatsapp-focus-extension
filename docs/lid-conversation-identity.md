# Identidade LID para recentes e coleções

**Status:** integrado; 378 testes passam, reabertura real aguarda confirmação do usuário.

## Decisão autorizada

Desambiguar contas com o mesmo nome usando somente LID opaco do WhatsApp
(formato ilustrativo: 101010101010101@lid), nunca um identificador de telefone.
LID ainda é dado pessoal identificável; não é anonimização nem criptografia.

Capturar apenas conversa escolhida/aberta pelo usuário. Recentes guardam a
identidade só na memória da aba; coleções podem persistir {title,lid} em
chrome.storage.local, no adaptador isolado já existente. Não guardar modelos,
telefone, identificadores @c.us/@s.whatsapp.net/@g.us, mensagens ou previews.

## Formato e compatibilidade

Entradas antigas continuam strings. Novas entradas privadas com chave disponível
são {title,lid}; somente esses campos são admitidos. O schema v1 existente passa a
aceitar essa união, sem trocar chave de armazenamento ou converter entradas antigas.

Deduplicação/remoção usa LID quando presente; dois números com o mesmo título ficam
como itens independentes. Rótulos continuam sendo títulos, sem mostrar a chave.
Uma string antiga não é associada automaticamente a um LID por semelhança de nome.
Objeto com chave inválida é recusado, nunca rebaixado silenciosamente a título.

Para atualizar um membro antigo: remover o item e adicioná-lo novamente a partir
da conversa correta aberta. Recentes são reconstruídos ao abrir conversas após
recarregar. Se uma chave não estiver disponível, grupos/entradas sem LID mantêm
a seleção antiga por título exato único, sem tentar obter telefone.

## Reabertura

1. Buscar somente o título, como antes; nunca inserir LID no campo de busca.
2. Escopo permanece Conversas/Chats, excluindo contatos/mensagens.
3. Com LID salvo, exigir título exato E chave correspondente em todos os casos,
   inclusive resultado único. Ausência/chave errada não usa fallback de nome.
4. Manter duas observações do mesmo alvo; reconferir chave imediatamente antes
   do mousedown nativo. Confirmar título E LID no cabeçalho após seleção.
5. Se não houver correspondência segura, falhar sem adivinhar.

Não houve descoberta de outra API de abertura. Mudança de nome pode exigir nova
captura, já que a consulta ainda usa o título salvo. Estabilidade de LID entre
migrações/re-registro da conta não foi demonstrada; uma chave que deixar de
corresponder falha fechada.

## Ponte e captura

Acesso MAIN usa árvore React comprometida e modelo canônico. Leitura de identidade
aceita flag archive ausente em modelos nativos, sem afrouxar guardas das ações mutáveis.
Nos resultados, a herança de modelos é limitada pela grid para não atribuir a um
resultado o modelo da conversa selecionada em um ancestral global.

Ponte síncrona por CustomEvent mantém seleção/leitura e clique na mesma tarefa:
selected retorna somente LID validado da conversa visível; match retorna somente
booleano no contexto de navegação interna. chosen exige escolha nativa confiável,
alvo exato e grant efêmero para capturar a linha escolhida antes do commit.
Isso impede registrar o número anterior quando os títulos são iguais.

Nenhuma chave entra em atributos/elementos do DOM, logs, clipboard, diagnósticos ou awareness. O LID
selecionado cruza mundos localmente para o armazenamento isolado autorizado;
a página já possui seus modelos nativos. Essa ponte não autentica contra a própria
página WhatsApp, que já controla seus dados, nem expõe comando mutável/arbitrário.

## Evidência e limites

- Modelos privados já carregados usam namespace lid e chave serializada @lid;
  nenhum valor real foi exportado ou gravado na investigação.
- Mapeamento de linhas foi exercitado em leitura somente no DOM nativo, sem abrir
  chat: 12 de 14 frames da amostra resolveram modelo, 10 com LID; não inferir suporte
  universal dos dois frames indisponíveis.
- Resposta síncrona entre mundos foi verificada na instalação, com nenhuma conversa
  selecionada e nenhum identificador real retornado.
- Testes incluem homônimos, remoção independente, reload do formato persistido,
  rejeição de telefone/chave inválida, falta de correspondência mesmo com nome único,
  confirmação de cabeçalho, captura do número antigo, escopo e ancestral de grid.
- Não foi realizado clique de reabertura de conversa pelo agente, nem teste de
  persistência de chave nativa entre sessões. Validação dessa rota pertence ao usuário.
- Chrome de diagnóstico fechado, porta 9222 verificada fechada; perfil vinculado retido.
- Sem nova permissão, backend, mudanças na DS6 ou release.

## Teste curto

Recarregar extensão e aba; abrir pela interface nativa a conversa do número desejado,
voltar ao foco e reabri-la pelos recentes. Repetir com o outro número de mesmo nome.
Para coleções antigas, remover/reincluir a partir da conversa certa. Não abrir chat
novo/não lido só para testar sem decisão do usuário.
