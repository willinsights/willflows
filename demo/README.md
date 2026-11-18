# WillFlow 2.0 — Demonstração navegável

**Protótipo autónomo, criado para testar a experiência do produto sem custos Lovable.**
Não é uma implantação real do WillFlow 2.0 e não executa os sistemas reais.

## Abrir

- [Demonstração interativa](https://raw.githack.com/willinsights/willflows/willflow-2-demo-static/demo/willflow20.html)
- [Código da demonstração](https://github.com/willinsights/willflows/blob/willflow-2-demo-static/demo/willflow20.html)

O conteúdo é servido por raw.githack.com (serviço estático de terceiros), não pelo Lovable Cloud. Ao abrir HTML, esse serviço pode mostrar um aviso para confirmar o endereço antes de apresentar a demo.

## O que experimentar

19 módulos: dashboard, captação, edição, finalizados, tarefas, CRM, contratos, calendário, chat, Media Hub, revisão de vídeo, pagamentos, financeiro, relatórios, faturação, equipa, planos, administração e configurações.

Experimenta criar um projeto, avançá-lo pelo fluxo de produção, adicionar um cliente, escrever no chat, marcar uma fatura ou pagamento como pago, aprovar um vídeo, adicionar comentários com timecode ou criar um evento no calendário. O botão Repor demo reinicia os dados locais.

## Garantias e limitações

- Tudo dentro de um ficheiro HTML independente com CSS/JS integrados.
- Sem dependências, SDKs, imagens externas, serviços de terceiros ou chamadas de rede.
- Política CSP com connect-src 'none'.
- Dados fictícios de estúdio, clientes, equipa, utilizadores, faturas e vídeos.
- Alterações de exemplo persistidas apenas em localStorage no dispositivo; não há contas nem autenticação.
- Os vídeos são capas ilustrativas, sem reprodução Cloudflare.
- Os números de armazenamento, rentabilidade e cobrança são exemplos, não dados de produção.
- A demonstração não integra as migrações SQL do PR #2 e nunca deve fazer merge no main como substituto da app.

## Porque é diferente da pré-visualização Lovable

Em 18/11/2026, o workspace Lovable estava sem créditos e a tentativa de criar um remix falhou antes de gerar o projeto. Esta versão permite explorar os módulos sem criar cópias de bases de dados, sem tocar no backend Lovable Cloud e sem custo de execução de um agente Lovable.

Validação automática: node demo/test-demo.cjs.
