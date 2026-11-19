# Registro de trabalho — Ecossistema Cobre

Arquivo vivo para registrar o que existe, o que mudou, verificações e trabalho pendente por aplicativo. Atualize junto a cada entrega; não marque itens apenas planejados como concluídos.

## 2026-11-19 — Cobre Server 0.4.0-beta.1 preparado para validação

- O serviço foi transformado em aplicativo desktop Electron: janela própria, controle seguro de saída e acesso à pasta de dados.
- A central ganhou páginas de visão geral, dispositivos, conexões, configurações e notas da versão, com a identidade visual e logo Cobre.
- Foi configurado workflow Windows que produz ZIP portátil e instalador.
- O `package-lock.json` registra dependências; `minimatch` foi atualizado por override, e `npm audit` reportou zero vulnerabilidades conhecidas na árvore instalada.
- A suíte de testes foi estabilizada para usar access token longo nos casos gerais e testar a expiração em servidor isolado. A lista permitida de metadados tem cobertura contra caminhos e campos secretos.
- Corrigida a rota da logo do painel: o app tentava ler `dashboard/icon.png`, que não existia no pacote; agora serve `dashboard/brand.png`.
- Cadastro valida o tipo de aparelho antes de criar a conta; teste confirma que um cadastro inválido não reserva o email.
- O serviço falha fechado se a chave local estiver truncada ou inválida; teste dedicado confirma a recusa de inicialização.
- Testes locais: 13/13 passaram, incluindo host/origem não permitidos, chave corrompida e integridade da imagem servida. `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas.
- Repeti `npm ci`, os 12 testes, `npm audit` e `npm run dist:win` em uma cópia limpa com Node 22.13.0 (a mesma versão fixada no workflow); tudo passou localmente.
- `npm run dist:win` concluiu na cópia limpa Node 22.13 após validar chave corrompida e gerou ZIP x64 (153.266.914 bytes) e instalador NSIS x64 (121.376.172 bytes). SHA-256 local: ZIP `ea1032c6430305203057d8e656eeb389a5e35724747e32320f50b000126d631f`; EXE `f30c5ebd3aed7a9ce7b39782d1ec4377db765204611e61d05f3b2e333c072a73`. O workflow publicado recalcula os hashes dos seus próprios artefatos.
- As notas da versão dentro do app citam a validação nova e o colaborador @dilucas00.
- A execução 44621300944 expôs a causa fatal em anotação pública: o electron-builder detectava CI e tentava publicar implicitamente, mas não havia `GH_TOKEN`. O script agora usa `--publish never`; a publicação fica na etapa explícita `publish-release`.
- Build local com Node 22.13.0 gerou ZIP beta (153.267.180 bytes; SHA-256 `188ce8fa874cc1b763d66fd156e307be0c37e99e94fefc0549f3975a6b29dbee`) e instalador (121.376.283 bytes; SHA-256 `227ea6e8520b49b7efade4c80d1fb7b8a80f4a1c7c395649c15a4212c6911db5`). Verificados integridade do ZIP, `app.asar` e recursos da dashboard; assinatura Authenticode ausente.
- O commit `639e5f2` corrigiu o modo de publicação e alinhou `package.json`/lock/changelog com `0.4.0-beta.1`. Actions passou por testes, auditoria, empacotamento Windows, checksums e upload; a tag `v0.4.0-beta.1` agora tem release pública com ZIP, instalador e checksums. Baixei o ZIP publicado (153.267.221 bytes), validei os 75 itens e `app.asar`; SHA-256 bate com a release: `b38d0e078990e3b4e6003e9e9187af5eed2aa6131ab65d0950e84c8c99ad1a3f`. O instalador é não assinado. Teste visual e de rede no Windows continuam pendentes.
- Colaborador registrado nos créditos: [@dilucas00](https://github.com/dilucas00).

## Estado por aplicativo

### Cobre Desktop

- Repositório: [bruncosta077-boop/Cobre](https://github.com/bruncosta077-boop/Cobre), clone completo do app.
- Versão pública 3.5.0; código 3.6.0 em validação. Atualizados music-metadata (corrigindo parser ASF vulnerável), electron-builder e minimatch; `npm audit` indica zero vulnerabilidades conhecidas na árvore Desktop atual.
- ZIP x64 (153.710.838 bytes), instalador (121.779.176 bytes) e pacote portátil de atualização 3.6.0 (698.768 bytes) foram gerados localmente. Manifesto, limites e caminhos do pacote de atualização foram verificados. SHA-256: ZIP `1c07887bb905b512f73f36998fd7afb137fe056be014edb874a9c430c078b971`; EXE `96665ace9e8af1594e47f700da10f4856c5857f2f69d602dad7fdbf89e1d250d`; atualização `a926d4db408b3b907636bc97033653fbb90cca4d4cbfd2fc70ed046eebd5015a`. Ainda falta validar a execução no aplicativo/aparelho e publicar.
- README mostra logo, captura e download público 3.5.0; “Sobre” cita @dilucas00. Changelog 3.6.0 e correções de segurança estão no commit `9b425a3`; o commit `1ad0e7e` documenta que o acesso remoto usa HTTP e que o endereço com chave deve ser tratado como senha. Pacote local gerado, validação funcional e publicação ainda pendentes.

### Cobre Mobile

- Repositório: [bruncosta077-boop/Cobre-Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile), clone local em `Cobre Mobile/01 - Código-fonte/Cobre-Mobile`.
- Versão 0.2 foi confirmada pelo autor em aparelho; 0.6 LAN foi confirmada. O APK debug 0.7 compila com JDK 17/Gradle 8.9 (37 tarefas), e o GitHub Actions para o commit `5f24a2a` concluiu com sucesso. As chamadas de conta e catálogo bloqueiam redirecionamentos; HTTP só aceita loopback/IP privado e não aceita domínio `.local`. Crédito e notas 0.7 ainda aguardam teste no aparelho.
- Existem biblioteca local, favoritos/histórico/playlists locais, Cobre ID, presença, fontes Desktop/LAN e reprodução em segundo plano.
- Diferenças conhecidas para Desktop: letras sincronizadas, créditos/encartes, edição de tags, estatísticas, DSP/equalizador/crossfade e sync de playlists. Consulte `ROADMAP.md` no repo Mobile.
- Próximo passo: testar 0.7, então escolher um recurso por vez; priorizar fila recuperável, letras/metadados e uma camada de player comum antes de duplicar a arquitetura Desktop.

### Cobre Server

- Repositório: [bruncosta077-boop/Cobre-Server](https://github.com/bruncosta077-boop/Cobre-Server).
- Versão `0.4.0-beta.1` preparada para validação. O fluxo de conta, sessões, dispositivos, presença e pareamento inicial existe.
- Não é um relay de mídia; o stream existente entre Mobile e Desktop é direto na LAN. Server ainda não descobre hosts nem mede o stream.
- Próximo passo: validar a beta em Windows e LAN (portas, autorização, revogação, encerramento/relançamento e dados); testar Mobile 0.7; então decidir quais lacunas de integração precisam entrar antes de planejar 1.0. O teste visual do executável está pendente; a tentativa anterior abriu o alerta do Firewall e não foi autorizada aqui.

### Cobre TV

- Ainda não há repositório GitHub Cobre TV. A base foi importada para o repositório local `Cobre TV/cobre-tv/cobre-tv`, commit `0b01b7f`; inclui README, changelog, registro, logo/banner, wrapper verificado e workflow de compilação.
- Protótipo `0.1.0` compilado pelo Gradle Wrapper 8.9 (35 tarefas); APK debug 9.220.558 bytes, SHA-256 `c12c10a9bbf4a8fc36a82ba1a112d282540e1542f84bfe3122cb0bacd3efa5fc`; manifesto não pede Internet até haver função de rede.
- Ainda usa álbuns falsos e não reproduz áudio, não pareia nem consulta Desktop/Cobre ID. Não foi testado em TV/emulador; não trate como app utilizável ou release.

## Segurança e validação pendentes

- Revisão estática do Desktop 3.6 encontrou `webSecurity: false` na janela principal e no mini player, além de um canal IPC genérico no preload e handlers de arquivos que recebem caminhos do renderer. A tela “Saúde do Cobre” já informa que a proteção está desligada para lidar com arquivos locais. Isso amplia o impacto de qualquer injeção de conteúdo; não declare o Desktop seguro até substituir esse acesso por protocolo local restrito, validar o remetente/caminhos de IPC e repetir testes funcionais.
- HTTP em LAN ainda expõe senha/token a usuários da rede. Manter o serviço em rede privada e sem port forwarding.
- O Server escuta a API em `0.0.0.0:8080` para a LAN; como é HTTP e o banco local não é criptografado em repouso, limitar a firewall/rede privada e proteger a conta Windows. O painel administrativo fica em loopback.
- Sem assinatura digital, Windows pode exibir aviso de editor desconhecido; publicar apenas o artefato produzido pelo workflow deste repositório.
- Conferir workflow Actions e artifact após cada push, não apenas estado local do build.
- Não declarar 1.0 estável até validar execução real em duas máquinas na LAN, autorização por aparelho, segurança de transporte e fluxos de atualização/recuperação.

## 2026-11-19 — Nova rodada de validação e hardening local

- Desktop 3.6.0: explicitados `nodeIntegration: false`, `contextIsolation: true` e `sandbox: true` nas janelas principal e mini player; novas janelas e navegação/redirecionamento para páginas diferentes das páginas locais do Cobre são bloqueados. `webSecurity: false` permanece por dependência atual de arquivos locais; não considerar esta correção uma revisão de segurança completa.
- Desktop: corrigida a versão exibida na interface de `3.5` para `3.6.0`, que já era a versão do pacote. `node --check` passou nos arquivos JavaScript e `git diff --check` passou. `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas.
- Desktop: `npm run dist` concluiu no Windows com Electron 45.3.4 / electron-builder 26.18.1. Os artefatos locais 3.6.0 foram verificados e o `app.asar` contém as mudanças acima. ZIP: 153.711.376 bytes, SHA-256 `40fc83ac3071436ccaec5bca2d42c5030a355de888b3f494959097e87accfcca`; instalador: 121.779.620 bytes, SHA-256 `a83f4d2fb1069894ccbda21b6bf0dae8a17a1073e6245cf3b3d1355fb51769db`. O app empacotado abriu; o Windows exibiu dois alertas de firewall e nenhum acesso foi autorizado. O processo de teste foi encerrado e não deixou porta em escuta. Reprodução musical não foi testada. Sem assinatura digital.
- Desktop: permanecem `webSecurity: false`, preload com IPC genérico, handlers privilegiados que recebem caminhos do renderer, ausência de CSP na janela principal e servidor remoto HTTP em `0.0.0.0:8787`. O servidor remoto usa chave na URL/cookie e não tem proteção de transporte; tratar o endereço completo como senha e usar apenas rede privada confiável. Próxima prioridade é migrar mídia para protocolo local restrito e reduzir/validar IPC antes de reativar `webSecurity`.
- Server: repetidos `npm test` (13/13 aprovados) e `npm audit --audit-level=moderate` (zero vulnerabilidades conhecidas). Isso não substitui teste de instalação e tráfego em LAN real. Mantêm-se as limitações HTTP em LAN, banco local sem criptografia em repouso e ausência de assinatura do instalador, já descritas acima e em `SECURITY.md`.
- Mobile 0.7: GitHub Actions para `5f24a2a08ee7af7e3abc3c93d2f443970a3737bf` confirmado como `success`. Build local de `testDebugUnitTest assembleDebug` concluído em cópia temporária de caminho ASCII: APK debug 62.075.730 bytes, SHA-256 `d3e3de1c5e5887be0285757c223267b3e42239941e8ac458f04e739affe4bf16`. O repositório não contém testes unitários (`NO-SOURCE`); houve avisos de APIs de ícones Compose depreciadas. Build direto do caminho atual falha porque há caracteres não ASCII no diretório (`Código-fonte`); não alterei arquivo de configuração do projeto para contornar isso. Nenhum Android foi encontrado por `adb`, portanto não houve teste de instalação, login ou playback nesta rodada.
- TV 0.1.0: com SDK local e JDK 17, `testDebugUnitTest :app:assembleDebug` concluiu; teste unitário não tem fontes (`NO-SOURCE`). APK debug: 9.220.558 bytes, SHA-256 `c12c10a9bbf4a8fc36a82ba1a112d282540e1542f84bfe3122cb0bacd3efa5fc`. Sem dispositivo/emulador para validar interface, foco remoto ou playback; a TV segue protótipo sem rede nem reprodução implementadas.
- JDK 17 temporário usado apenas para a validação foi baixado da distribuição oficial Microsoft OpenJDK e seu SHA-256 foi conferido com o arquivo oficial de checksum; não foi instalado no sistema nem no projeto.
- Os artefatos Desktop desta rodada são locais, ainda não publicados. As mudanças de código estão no checkout local e precisam de validação funcional antes de release.

## 2026-11-19 — Cobre Server 0.4.0-beta.2 em validação

- A API agora verifica o IP real da conexão antes de ler corpo ou atender rotas. Por padrão aceita loopback, IPv4 RFC1918, IPv4 link-local, IPv6 ULA e IPv6 link-local; recusa origem pública e CGNAT. O painel permanece em loopback. Isso reduz exposição acidental por encaminhamento de porta, mas não resolve espionagem dentro da LAN nem substitui HTTPS/firewall.
- Testes novos cobrem faixas locais e públicas, inclusive endereço IPv4 mapeado em IPv6, e chamam o handler real para confirmar HTTP 403 antes de `/health`. Resultado atualizado: `npm test` 15/15 aprovados; `npm audit --audit-level=moderate` zero vulnerabilidades conhecidas.
- Package, lock, README, notas dentro do app, roadmap, changelog e SECURITY foram atualizados para `0.4.0-beta.2`. Com Node 22.13.0/npm 10.9.2: `npm ci` passou, `npm test` 15/15, `npm audit` zero vulnerabilidades e `npm run dist:win` passou. O ZIP local (153.267.515 bytes; SHA-256 `4fe98f6f28e59d2e5e4c4eee253ba4cc21fd545a3d65c62c6e6581960ab15253`) e o instalador (121.376.651 bytes; SHA-256 `8d851b1751cbdd2086edd446ba3dc84fc79f15f86f301865dc078ab1f046f447`) contêm o filtro de rede e as notas beta. Ainda falta confirmar GitHub Actions e validar tráfego em LAN real; não criar release 1.0.0 sem transporte seguro e teste de instalação/dispositivo.
- `npm ci` ainda imprime avisos de pacotes indiretos depreciados (`inflight`, `rimraf@2`, `glob@7`, `boolean`); o audit não reporta vulnerabilidades conhecidas. A cadeia de build deve ser atualizada/reduzida antes da 1.0.
- Varredura dos quatro repositórios não encontrou caminhos de banco, chaves, `.env`, configurações locais nem padrões comuns de token/credencial entre os arquivos versionados. Esta busca é uma verificação pontual, não um scanner de segredo certificado.
