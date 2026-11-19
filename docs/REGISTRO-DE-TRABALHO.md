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
- O comando corrigido foi executado localmente com Node 22.13.0 e gerou ZIP e instalador Windows x64. SHA-256 do ZIP `1c2cdd77faae505672747be15b5d859004ea611962acd7f401b65299b40926c3`; EXE `d19711ac25ca23edf961e1e6a09bdbfef4991635bd02dfadc6e8870ca698c597`. Build remoto ainda precisa confirmar o pacote e recalcular seus próprios hashes.
- O pacote e o changelog agora usam `0.4.0-beta.1` de forma consistente; a release permanece sem tag até o Actions passar.
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
- Próximo passo: confirmar no Actions a correção do build, então publicar a pré-release; depois validar o ZIP no Windows, portas, LAN, revogação, saída/relançamento e dados. O teste visual do executável está pendente; a tentativa anterior abriu o alerta do Firewall e não foi autorizada aqui.

### Cobre TV

- Ainda não há repositório GitHub Cobre TV. A base foi importada para o repositório local `Cobre TV/cobre-tv/cobre-tv`, commit `0b01b7f`; inclui README, changelog, registro, logo/banner, wrapper verificado e workflow de compilação.
- Protótipo `0.1.0` compilado pelo Gradle Wrapper 8.9 (35 tarefas); APK debug 9.214.200 bytes, SHA-256 `a5a2e5074d2eef32aaf07429f35c42b6551ef655d04b4a75e4ba2f408997b3fb`.
- Ainda usa álbuns falsos e não reproduz áudio, não pareia nem consulta Desktop/Cobre ID. Não foi testado em TV/emulador; não trate como app utilizável ou release.

## Segurança e validação pendentes

- Revisão estática do Desktop 3.6 encontrou `webSecurity: false` na janela principal e no mini player, além de um canal IPC genérico no preload e handlers de arquivos que recebem caminhos do renderer. A tela “Saúde do Cobre” já informa que a proteção está desligada para lidar com arquivos locais. Isso amplia o impacto de qualquer injeção de conteúdo; não declare o Desktop seguro até substituir esse acesso por protocolo local restrito, validar o remetente/caminhos de IPC e repetir testes funcionais.
- HTTP em LAN ainda expõe senha/token a usuários da rede. Manter o serviço em rede privada e sem port forwarding.
- O Server escuta a API em `0.0.0.0:8080` para a LAN; como é HTTP e o banco local não é criptografado em repouso, limitar a firewall/rede privada e proteger a conta Windows. O painel administrativo fica em loopback.
- Sem assinatura digital, Windows pode exibir aviso de editor desconhecido; publicar apenas o artefato produzido pelo workflow deste repositório.
- Conferir workflow Actions e artifact após cada push, não apenas estado local do build.
- Não declarar 1.0 estável até validar execução real em duas máquinas na LAN, autorização por aparelho, segurança de transporte e fluxos de atualização/recuperação.
