# Roadmap do Cobre Server

## Versão em publicação — 0.5.0-beta.12

- [x] Identidade visual própria para o aplicativo Cobre Server, com símbolo de módulos centrais distinto do player Desktop.
- [x] Pedidos de autorização Mobile visíveis no painel local, com instruções para aprovar pelo Desktop e prazo sincronizado com o Mobile.

## Funcionalidades publicadas — até 0.5.0-beta.9

- [x] Contas, login, sessões com renovação e dispositivos vinculados.
- [x] Presença por heartbeat e endpoints transacionais de solicitação/aprovação/resgate de código para TV.
- [x] Mobile implementa aprovação; TV 0.2.0 solicita, espera, resgata o código e protege seu token com Android Keystore.
- [ ] Validar o pareamento entre Server, Mobile e TV físicos; os clientes ainda são builds de desenvolvimento e não foram testados em aparelhos reais.
- [x] Aplicativo desktop Electron para Windows, com interface de gerenciamento local.
- [x] Painel de estado, contas, dispositivos, filtros, portas e pasta de dados.
- [x] Workflow do GitHub Actions para gerar ZIP portátil e instalador Windows.
- [x] Exportar/restaurar uma cópia criptografada da base e chave, com validação e cópia de recuperação.
- [x] API de concessão limitada a cada Desktop host: pedido, aprovação/recusa no host, escopos, expiração, validação e revogação. Desktop e Mobile ainda não consomem as rotas.
- [x] Consentimento por 30 dias com tokens de acesso curtos renováveis enquanto a permissão estiver válida.
- [x] Central local lista e revoga permissões emitidas por host.
- [ ] Acesso autorizado do Mobile/TV à biblioteca e ao áudio do Desktop.
- [x] Receber e exibir taxa e latência inicial do stream reportadas pelo Mobile, separadas de presença e latência do catálogo.
- [ ] Métricas de erros do Desktop, suporte equivalente na TV e validação integrada em uso real.
- [x] HTTPS/TLS opcional com certificado confiável PEM, ativação na interface e API HTTPS-only após reinício.
- [ ] Validar certificado/URL e login Cobre ID em Desktop, Mobile e TV físicos.
- [x] Atualizador integrado para releases oficiais Windows x64, com notas, SHA-256 e confirmação antes de instalar.
- [ ] Assinatura digital do aplicativo Windows.
- [ ] Validar backup/restauração pela interface Windows com instalação e dados reais.

## Próximos marcos de integração

1. Integrar as rotas de solicitação/aprovação/revogação de host ao Desktop e ao Mobile; os aplicativos ainda não consomem a API.
2. Aplicar e validar a permissão curta no catálogo, nos controles de playback e no endpoint de áudio do Desktop.
3. Validar pareamento e revogação entre aparelhos reais; corrigir diferenças de rede e versões encontradas.
4. Concluir biblioteca e playback reais na TV, mantendo o áudio direto entre Desktop e aparelho.
5. Validar em aparelhos reais certificado confiável, URLs e login Cobre ID via HTTPS antes de uso fora de uma LAN confiável.

## Itens anotados para evolução

- Perfil Cobre ID: mostrar com clareza qual conta está conectada, exibir seus dados básicos e permitir editar os campos de perfil suportados. Ainda não implementado; será trabalhado depois da integração e estabilização do acesso autorizado ao Desktop.

## Aplicativo Cobre Server

- [x] Janela própria do aplicativo; não abre o painel num navegador externo.
- [x] Encerramento controlado do serviço e acesso à pasta de dados.
- [x] Pacote ZIP portátil e instalador gerados para Windows.
- [x] Exportação/restauração criptografada da base e chave local, com confirmação e cópia de recuperação.
- [ ] Validar backup/restauração pela interface Windows com instalação descartável e dados de teste.
- [x] Atualizador dentro do aplicativo, com SHA-256 e notas da versão.
- [ ] Assinatura digital do executável Windows.
- [ ] Validar HTTPS e login com certificados confiáveis nos aparelhos Desktop, Mobile e TV.
- [ ] Configuração assistida de rede, logs sanitizados e suporte a relay de mídia, caso necessário para o uso fora da LAN.

## Critérios de pronto

- Nenhum áudio passa pelo servidor central.
- Um aparelho revogado perde acesso ao Desktop autorizado.
- Presença online não é confundida com conectividade ou reprodução de stream.
- Uma cópia criptografada válida recupera contas/sessões; senha errada ou arquivo adulterado não altera os dados atuais.
- As medições têm origem, unidade e janela explícitas.
- Perda da internet não interrompe indevidamente o streaming local já autorizado.
