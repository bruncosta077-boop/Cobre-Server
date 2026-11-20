# Roadmap do Cobre Server

## Versão atual — 0.5.0-beta.2 em desenvolvimento

- [x] Contas, login, sessões com renovação e dispositivos vinculados.
- [x] Presença por heartbeat e endpoints de solicitação/aprovação/resgate de código para TV; os clientes ainda não usam o fluxo integralmente.
- [x] Aplicativo desktop Electron para Windows, com interface de gerenciamento local.
- [x] Painel de estado, contas, dispositivos, filtros, portas e pasta de dados.
- [x] Workflow do GitHub Actions para gerar ZIP portátil e instalador Windows.
- [x] Exportar/restaurar uma cópia criptografada da base e chave, com validação e cópia de recuperação.
- [ ] Solicitação e consulta de código nos clientes Mobile/TV.
- [ ] Concessão de acesso limitada a cada Desktop host.
- [ ] Acesso autorizado do Mobile/TV à biblioteca e ao áudio do Desktop.
- [x] Receber e exibir taxa e latência inicial do stream reportadas pelo Mobile, separadas de presença e latência do catálogo.
- [ ] Métricas de erros do Desktop, suporte equivalente na TV e validação integrada em uso real.
- [ ] HTTPS/TLS com configuração de confiança utilizável pelos clientes.
- [ ] Assinatura do aplicativo e atualizador integrado.
- [ ] Validar backup/restauração pela interface Windows com instalação e dados reais.

## Próximos marcos de integração

1. Fechar o contrato de pareamento, expiração, limites e erros; implementar o fluxo nos clientes.
2. Identificar cada Desktop host e emitir uma permissão curta, limitada e revogável.
3. Manter o áudio direto do Desktop ao aparelho, sem retransmissão pelo serviço central.
4. Distinguir conta ativa, Desktop alcançável na rede e stream reproduzindo com sucesso.
5. Receber métricas agregadas reportadas pelos clientes, sem guardar áudio, caminhos, nomes de faixas ou histórico.

## Aplicativo Cobre Server

- [x] Janela própria do aplicativo; não abre o painel num navegador externo.
- [x] Encerramento controlado do serviço e acesso à pasta de dados.
- [x] Pacote ZIP portátil e instalador gerados para Windows.
- [x] Exportação/restauração criptografada da base e chave local, com confirmação e cópia de recuperação.
- [ ] Assinatura digital e atualizações no próprio aplicativo.
- [ ] Configuração assistida de rede, logs sanitizados e HTTPS utilizável pelos clientes.

## Critérios de pronto

- Nenhum áudio passa pelo servidor central.
- Um aparelho revogado perde acesso ao Desktop autorizado.
- Presença online não é confundida com conectividade ou reprodução de stream.
- Uma cópia criptografada válida recupera contas/sessões; senha errada ou arquivo adulterado não altera os dados atuais.
- As medições têm origem, unidade e janela explícitas.
- Perda da internet não interrompe indevidamente o streaming local já autorizado.
