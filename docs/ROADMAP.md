# Roadmap do Cobre Server

Marcos abaixo representam trabalho futuro, salvo itens marcados como existentes. Nenhuma fase de integração vira concluída sem validar Desktop, Mobile e TV juntos.

## Versão atual — 0.3.0 em desenvolvimento

- [x] Contas, login e renovação de sessão.
- [x] Dispositivos vinculados e revogáveis.
- [x] Presença por heartbeat.
- [x] Aprovação inicial de pareamento por código no Desktop.
- [x] Painel local de saúde do serviço e presença dos aparelhos.
- [ ] Solicitação e consulta de código nos clientes Mobile/TV.
- [ ] Concessão limitada para um Desktop específico.
- [ ] Acesso do Mobile/TV à biblioteca ou ao áudio do Desktop.
- [ ] Medições de latência, taxa de transferência e falhas de stream.

## Fase 1 — Contrato de pareamento

- Fechar campos, expiração, limites e erros do fluxo de código.
- Implementar solicitação e polling no cliente TV e aprovação equivalente no Mobile.
- Exibir dispositivos vinculados e permitir revogação pelo usuário.

## Fase 2 — Concessão por host

- Identificar cada Desktop host separadamente.
- Emitir uma permissão curta, limitada a host e escopos de leitura/controle.
- Fazer a revogação impedir novas solicitações de biblioteca e streaming.
- Manter streaming de áudio direto do Desktop para o aparelho autorizado.

## Fase 3 — Estado e diagnóstico

- Distinguir conta conectada, host encontrado na LAN e stream funcionando.
- Adicionar um diagnóstico de conexão iniciado pelo cliente.
- Medir latência e taxa recebida com janela curta e amostra de áudio limitada.
- Mostrar último heartbeat, taxa recente, erros e versão de cada cliente.
- Não armazenar nomes de faixas, caminhos, áudio ou histórico de reprodução no serviço central.

## Fase 4 — Aplicativo Cobre Server

- [x] Painel local separado da API, com saúde, contas e aparelhos/heartbeat.
- [x] Painel restrito ao próprio computador; sem credenciais e sem áudio.
- [ ] Iniciar/parar o serviço pelo painel e consultar logs sanitizados.
- Documentar instalação, atualização, cópia de segurança e restauração.

## Critérios de pronto

- Nenhum áudio passa pelo serviço central.
- Um aparelho revogado perde acesso ao host.
- Estado online não é confundido com conectividade de stream.
- As medições são reproduzíveis, têm unidade e janela explícitas.
- Perda de internet não derruba indevidamente o streaming já autorizado na rede local.
