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
- Testes locais finais: 12/12 passaram, incluindo host/origem não permitidos e integridade da imagem servida. `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas.
- `npm run dist:win` concluiu após as correções e gerou ZIP x64 (153.267.090 bytes) e instalador NSIS x64 (121.376.170 bytes). SHA-256 local: ZIP `43f16e9241479b5225d7b7c72ea963ebff8c4427b8d11694c5828a752bffd988`; EXE `562c69a085fce53880bf9f28ca75d400085e21fe25e84f63fb93a83fa2138a54`. O workflow publicado recalcula os hashes dos seus próprios artefatos.
- As notas da versão dentro do app citam a validação nova e o colaborador @dilucas00.
- O commit `7976043` já estava em `main` antes destas alterações. Esta revisão beta, o workflow e os registros descritos aqui ainda precisam de commit, publicação e validação do GitHub Actions.
- Colaborador registrado nos créditos: [@dilucas00](https://github.com/dilucas00).

## Estado por aplicativo

### Cobre Desktop

- Repositório: [bruncosta077-boop/Cobre](https://github.com/bruncosta077-boop/Cobre), clone completo do app.
- Versão pública 3.5.0; código 3.6.0 em validação. Atualizados music-metadata (corrigindo parser ASF vulnerável), electron-builder e minimatch; `npm audit` indica zero vulnerabilidades conhecidas na árvore Desktop atual.
- ZIP x64 (153.710.838 bytes), instalador (121.779.176 bytes) e pacote portátil de atualização 3.6.0 (698.768 bytes) foram gerados localmente. Manifesto, limites e caminhos do pacote de atualização foram verificados. SHA-256: ZIP `1c07887bb905b512f73f36998fd7afb137fe056be014edb874a9c430c078b971`; EXE `96665ace9e8af1594e47f700da10f4856c5857f2f69d602dad7fdbf89e1d250d`; atualização `a926d4db408b3b907636bc97033653fbb90cca4d4cbfd2fc70ed046eebd5015a`. Ainda falta validar a execução no aplicativo/aparelho e publicar.
- README mostra logo, captura e download público 3.5.0; “Sobre” cita @dilucas00. Changelog 3.6.0 criado. Alterações aguardam commit/publicação.

### Cobre Mobile

- Repositório: [bruncosta077-boop/Cobre-Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile), clone local em `Cobre Mobile/01 - Código-fonte/Cobre-Mobile`.
- Versão 0.2 foi confirmada pelo autor em aparelho; 0.6 LAN foi confirmada. O código atual compila como APK debug com JDK 17 e Gradle 8.9; os ajustes de presença/latência, o crédito e as notas 0.7 ainda aguardam teste no aparelho e publicação.
- Existem biblioteca local, favoritos/histórico/playlists locais, Cobre ID, presença, fontes Desktop/LAN e reprodução em segundo plano.
- Diferenças conhecidas para Desktop: letras sincronizadas, créditos/encartes, edição de tags, estatísticas, DSP/equalizador/crossfade e sync de playlists. Consulte `ROADMAP.md` no repo Mobile.
- Próximo passo: testar 0.7, então escolher um recurso por vez; priorizar fila recuperável, letras/metadados e uma camada de player comum antes de duplicar a arquitetura Desktop.

### Cobre Server

- Repositório: [bruncosta077-boop/Cobre-Server](https://github.com/bruncosta077-boop/Cobre-Server).
- Versão 0.4.0 em desenvolvimento. O fluxo de conta, sessões, dispositivos, presença e pareamento inicial existe.
- Não é um relay de mídia; o stream existente entre Mobile e Desktop é direto na LAN. Server ainda não descobre hosts nem mede o stream.
- Próximo passo: publicar a beta e validar o ZIP no Windows; conferir portas, LAN, revogação, saída/relançamento e caminho de dados. O app não foi confirmado em teste de janela após a falha de logo; a tentativa anterior abriu o alerta do Firewall do Windows, que não foi autorizado aqui.

### Cobre TV

- Não há repositório Cobre TV entre os três repositórios GitHub atuais; há apenas o pacote inicial local `Cobre TV/cobre-tv-starter.zip`.
- A trilha de release notes deve começar quando a versão de código for importada para um repositório próprio.
- Base planejada: navegação por D-pad, pareamento Cobre ID por código, biblioteca do Desktop autorizada e playback Media3; nenhuma dessas funções deve ser declarada pronta sem build e teste em Android TV/Google TV.

## Segurança e validação pendentes

- HTTP em LAN ainda expõe senha/token a usuários da rede. Manter o serviço em rede privada e sem port forwarding.
- Sem assinatura digital, Windows pode exibir aviso de editor desconhecido; publicar apenas o artefato produzido pelo workflow deste repositório.
- Conferir workflow Actions e artifact após cada push, não apenas estado local do build.
- Não declarar 1.0 estável até validar execução real em duas máquinas na LAN, autorização por aparelho, segurança de transporte e fluxos de atualização/recuperação.
