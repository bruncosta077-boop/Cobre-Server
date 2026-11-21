# Registro de trabalho — Ecossistema Cobre

## 2026-11-21 — estabilidade do Cobre Server e diagnóstico de rede

- Desktop: corrigi a versão fixa 3.11.0 do rodapé/Sobre/diagnóstico; a interface agora consulta `app.getVersion()`. Release 3.12.2 publicada com instalador, ZIP portátil, pacote de atualização e checksums; Actions de branch/tag concluíram com sucesso.
- Causa observada no Mobile: o endereço salvo era o IP correto do PC (`192.168.15.3:8080`), mas a API não respondia naquele momento. Ao iniciar o Cobre Server instalado, `/health` respondeu em loopback e no IP da rede. As regras do Firewall do Windows para os executáveis Server e Desktop existem no perfil Particular.
- Server 1.0.0: fechar o × minimiza à bandeja; o serviço permanece aberto até “Encerrar servidor”. Adicionada opção para iniciar em segundo plano com o Windows. Ícone incluído no pacote. O papel do Server permanece identidade/autorização; música vai diretamente do Desktop ao Mobile.
- Validação local: testes do Server 38/38; `npm audit --audit-level=moderate` sem vulnerabilidades; build Windows local e smoke test do executável 1.0.0 passaram. Depois de fechar a janela do smoke test, `/health` continuou respondendo. A porta 8080 de produção ficou ativa no Server instalado; as portas de teste foram fechadas.
- Mobile 0.13.1: agora converte timeout, conexão recusada e host inválido em instruções úteis. O Gradle local não pode compilar com o Java 25 instalado nesta máquina; a validação final será pelo GitHub Actions configurado com Java 17 e assinatura oficial.
- A captura do telefone não pode ser reproduzida aqui; ainda é necessário confirmar a conexão do aparelho físico após atualizar/abrir o Server. Presença/health local não provam que o telefone alcança a rede.

## 2026-11-21 — solicitação do Mobile e autorização do Desktop sincronizadas

- Corrigi a causa concreta do timeout: pedidos de acesso duravam 90 segundos no Server, enquanto o Mobile desistia após 84 segundos. O Cobre Server beta.12 agora mantém cada pedido por cinco minutos; o Mobile 0.12.1 usa o `expiresIn` retornado e aguarda esse prazo no fluxo manual e no QR.
- O painel agora mostra solicitações pendentes, nome do celular, conta, Desktop e vencimento. A navegação deixa quatro áreas principais visíveis e recolhe conexões, configurações e notas em **Mais opções**. Nenhum token é exibido no painel; o Desktop continua sendo o único lugar para permitir ou recusar.
- Revisei o Desktop 3.10.0 no Git (`4820eed`): essa versão adicionou o QR seguro, mas manteve os pedidos na janela separada **Conta Cobre**, que se abre pelo botão **Conta Cobre…** em Configurações. A janela consulta pedidos a cada cinco segundos; não há aprovação de acesso na tela principal. O Mobile e o Server agora dizem explicitamente onde encontrá-la.
- Server: testes 38/38, auditoria sem vulnerabilidades, verificações de sintaxe/whitespace e pacote Windows local aprovados. GitHub Actions da beta.12 `44909912101` terminou com sucesso. [Release beta.12](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.12), com instalador, ZIP e checksums. SHA-256: EXE `dab580db6ec11653a50031b0e71584f99e264df954a334cfb43147af3868013a`; ZIP `5eba3335ed62e297f726fcfec2194c13bfab04deda25f3934c87f790540fdb27`.
- Mobile: commit `a4a88f0` passou no build debug do GitHub Actions `44909781316`; o run `44910015984` compilou a versão release, validou a assinatura com `apksigner` e publicou o [APK 0.12.1](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.12.1) (HTTP 200, 49.404.422 bytes). SHA-256 oficial: `790fa25f6341e0f880a82e56e423aee94e23dea00f6ff66ba08f14742d9e8e0b`.

## 2026-11-21 — quadro geral corrigido após publicação do Mobile 0.12.0

- Corrigi [`docs/ESTADO-ECOSSISTEMA.md`](ESTADO-ECOSSISTEMA.md): agora registra a release assinada `mobile-v0.12.0` já publicada, a necessidade de cautela na migração inicial de APK debug e que as próximas atualizações com a mesma chave mantêm os dados.
- Mantive como pendente a validação dessa migração no aparelho e os marcos reais de integração/TV. O APK assinado foi confirmado na release do GitHub com 49.404.426 bytes.

## 2026-11-20 — Cobre Server 0.5.0-beta.11 publicado

- Refiz a identidade do ícone usando os sete tamanhos do ICO original do Desktop como base. O C cobre, o brilho e o fundo permanecem intactos fora da área central; substituí somente as barras centrais por três módulos Server menores, centralizados e monocromáticos.
- Atualizei o ícone do aplicativo, o PNG do painel, a marca SVG, o gerador reproduzível, o número da versão, changelog, README, roadmap e quadro do ecossistema.
- Conferência automatizada: 7 quadros no ICO original e no novo; nas comparações rasterizadas, nenhuma alteração ficou fora da área central em 6 quadros e 5 pixels de borda antialias ficaram na borda da máscara do quadro 256px; os pixels do C e do brilho permanecem iguais.
- Validação local: testes 38/38; `npm audit --audit-level=moderate` sem vulnerabilidades; `git diff --check` passou; instalador Windows x64 e ZIP beta.11 foram empacotados localmente. Os executáveis são sem assinatura Authenticode, como as versões anteriores.
- GitHub Actions da tag `44798792645` concluiu com sucesso; a [release beta.11](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.11) está pública com instalador, ZIP e checksums. SHA-256: EXE `d79e6686e00e99d2e61f044da7f1032e4db16890a04ca400690a881854bd6f15`; ZIP `c33e7ca6e3c43d49b425b1496368c51052d1d2536ba89e717ade80a324147151`.

## 2026-11-20 — Cobre Server 0.5.0-beta.9 publicado

- Corrigido um bloqueio para reprodução contínua: consentimento aprovado pelo Desktop dura 30 dias, enquanto o token enviado ao host dura 10 minutos.
- O aparelho autorizado renova o token pelo Cobre ID enquanto o consentimento existir; não precisa repetir o pedido/aprovação a cada 10 minutos. Revogação pelo host/painel e remoção do aparelho impedem renovações.
- A solicitação mantém sua expiração curta original. O identificador de concessão é entregue no primeiro resgate para o cliente armazenar junto ao token.
- Teste novo cobre expiração de token, renovação autorizada, isolamento por aparelho e expiração final do consentimento. Suíte: 38/38; auditoria sem vulnerabilidades; verificações de sintaxe e whitespace passaram. Build local Windows NSIS+ZIP passou.
- GitHub Actions `44780519579` (branch) e `44781018492` (tag) passaram. A [release beta9](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.9) publica instalador e ZIP Windows x64, ambos HTTP 200. Checksums oficiais: EXE `9b2f51f91f42d9e705ea3ab0dd7167bf28a478a19d4425e23fc90bafd4248a30`; ZIP `334dceca8b6749ce37c17111a265d755e73f675dcc255b5b1940fbd792474c1c`.

## 2026-11-20 — Cobre Server 0.5.0-beta.8 publicado

- A central local ganhou a página **Acessos ao Desktop**, que lista conta, aparelho autorizado, host, escopos e validade das concessões ativas.
- A página permite revogar concessões. A rota administrativa aceita somente JSON da mesma origem; o painel continua limitado a loopback.
- A interface explica que a autorização ainda não está integrada ao servidor de biblioteca/áudio no Desktop e ao fluxo do Mobile.
- Testes de API/painel cobrem dados das concessões, revogação por interface, tentativa de origem externa e JSON inválido. A suíte completa passou 38/38; auditoria sem vulnerabilidades; verificações de sintaxe e `git diff --check` passaram.
- GitHub Actions `44768476593` (branch) e `44769040814` (tag) passaram. A [release beta8](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.8) publica instalador e ZIP, ambos HTTP 200. Checksums oficiais: EXE `50de26e841eccfc51f9c53e4f00cb5fd94c35cd2f9ab2758cb8218c5b369fe31`; ZIP `09c5b56832a3b638694c3c676d9962709d5e28bb331758e9bed9d1658b9933a6`.

## 2026-11-20 — Cobre Server 0.5.0-beta.7 publicado

- Implementada a base de autorização por Desktop: o Mobile/TV solicita acesso a um host; o próprio Desktop autenticado consulta a fila e aprova ou recusa o pedido. O cliente recebe uma concessão assinada e limitada no tempo e por permissões.
- O Desktop pode validar e revogar concessões. O Server lista concessões ativas por conta; pedidos expiram, têm limite por dispositivo e são invalidados quando o cliente é removido.
- Testes cobrem aprovação/recusa, isolamento entre hosts e clientes, escopos, expiração, validação, revogação e metadados das concessões. Testes locais: 38/38 aprovados; `npm audit --audit-level=moderate`: zero vulnerabilidades; verificação de sintaxe e `git diff --check` passaram.
- Limite funcional: as rotas estão implementadas no Server, mas Desktop e Mobile ainda não as chamam nem aplicam os escopos às rotas de biblioteca/áudio. Não anunciar o streaming autorizado como funcional até completar essa integração e testar entre aparelhos.
- Item anotado para depois: mostrar a conta Cobre ID conectada em uma página de perfil editável, com os dados de perfil suportados.
- GitHub Actions `44765908584` (branch) e `44766490544` (tag) passaram. A [release beta7](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.7) publica instalador Windows x64 e ZIP; ambos retornam HTTP 200. Os checksums do manifesto conferem com os digests oficiais: EXE `7763f25cb50471c89b86e0fad2cc375761674557e77596c69b5a967ee2a554f4`; ZIP `261220f038f0a970572c09ee96dde049306186f257a126004856732f9d886971`.

## 2026-11-20 — Cobre Server 0.5.0-beta.6 publicado

- O atualizador agora recorre ao feed Atom oficial do GitHub quando a API pública responde com limite de consultas ou falha temporária.
- O fallback só aceita releases e ativos do repositório oficial, confirma a disponibilidade e o tamanho do instalador Windows x64, e continua exigindo SHA-256 antes de liberar o download.
- Testes cobrem parser do feed, rejeição de links externos e o fluxo API limitada → Atom → HEAD do instalador → manifesto → download → verificação SHA-256.
- Validação local: 36/36 testes passaram; `npm audit --audit-level=moderate` encontrou zero vulnerabilidades. A consulta online do atualizador desde a versão beta5 encontrou a beta6 publicada, retornando a URL oficial e o tamanho do instalador. A release inclui o manifesto oficial de checksums, validado contra os digests dos ativos na API do GitHub.
- Publicação verificada: os workflows da branch `44759833549` e da tag `44760524370` concluíram com sucesso. A release contém instalador (121.390.780 bytes), ZIP (153.283.652 bytes) e checksums; os três downloads respondem HTTP 200 e o manifesto corresponde aos SHA-256 da API do GitHub.
## 2026-11-20 — Cobre Server 0.5.0-beta.5 publicado

- A tela Configurações agora oferece importar um certificado e uma chave privada PEM. A validação confere formato, validade temporal e correspondência da chave antes de salvar no perfil local.
- HTTPS passa a substituir HTTP na porta da API, sem deixar um listener HTTP paralelo. A configuração reinicia o aplicativo, altera os endereços exibidos e mantém os dados em `%APPDATA%`.
- O painel explica que os clientes precisam usar URL/certificado confiáveis e que certificados autoassinados não são confiáveis automaticamente. Desativar HTTPS exige confirmação e reinicia explicitamente em HTTP.
- A integração HTTPS local gerou um certificado de teste no Windows, salvou/recarregou a configuração e consultou `/health` via HTTPS. A suíte completa passou 34/34; `npm audit --audit-level=moderate` não apontou vulnerabilidades.
- A versão [0.5.0-beta.5 foi publicada](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.5) com instalador Windows x64, ZIP portátil e checksums. Build/empacotamento `44757103582` e release `44757653578` passaram.
- O verificador do app consultou GitHub enquanto o limite público de API desta rede estava esgotado, então a descoberta automática da beta5 não pôde ser confirmada online nesta sessão. A release/links e os testes locais estão verificados; testar o botão em outra janela de limite confirma o caminho de UI. A suíte offline cobre seleção e verificação de ativos.
- Ainda falta validar login HTTPS nos aparelhos Desktop, Mobile e TV reais. O Server segue sem relay de mídia.

## 2026-11-20 — Cobre Server 0.5.0-beta.4 publicado

- Implementado no Server um fluxo dentro de Configurações para consultar a release oficial, ler notas, baixar o instalador Windows x64, conferir SHA-256 e pedir confirmação antes de iniciar a instalação.
- O processo principal valida origem da janela, versão, URL oficial, limite de tamanho e checksum; o hash é conferido novamente na hora de abrir. O atualizador guarda o instalador temporário fora da pasta do aplicativo e limpa resíduos próprios na inicialização.
- A atualização por cima mantém os dados do usuário em `%APPDATA%`; isso não é backup por si só. O Server já tem exportação criptografada da instância.
- Versão preparada: 0.5.0-beta.4. Validação local: 30/30 testes, verificações de sintaxe e `git diff --check`; `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas.
- Publicação verificada: [release 0.5.0-beta.4](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.4) contém instalador Windows x64, ZIP portátil e arquivo de checksums. CI Windows `44752004121` e publicação `44752434855` passaram.
- Teste online do verificador, usando a versão beta3 como instalada, encontrou a beta4 e o instalador correto. As notas da release agora descrevem o que mudou; releases futuras passarão a extrair automaticamente a seção correspondente do changelog.
- Não executamos a instalação na máquina do usuário nem fizemos validação visual. Continua pendente TLS, assinatura digital e validação física do ecossistema.

## 2026-11-20 — estado de atualização e retenção de dados

- Incluído `docs/ESTADO-ECOSSISTEMA.md`, com versões publicadas de Desktop, Mobile, Server e TV, diferença entre release e código atual, comportamento de atualização/dados e critérios que ainda bloqueiam a estabilidade 1.0.
- Evidência atual: Desktop 3.8.0 estável; Mobile 0.9.0 pré-release (código 0.10.0 ainda sem chave de distribuição); Server 0.5.0-beta.3; TV 0.2.0 ainda sem release e sem reprodução real.
- Revalidação local: `npm test` do Server passou 24/24; `npm audit --audit-level=moderate` reportou zero vulnerabilidades conhecidas. Isso não substitui teste de restauração pela interface nem validação TLS/dispositivos reais.
- A compilação Android da TV passou no workflow `44743655894` após adicionar os componentes de diálogo que faltavam. Pareamento foi implementado no código, mas aguarda teste físico com Server/Mobile reais.
- Mobile 0.11.0: o backup Android agora inclui configurações de acesso e email sem exportar refresh token; a migração do arquivo legado misto foi compilada no workflow `44746930132` (sucesso). Não existe APK assinado de release até configurar a chave estável; restauração em aparelho não foi testada.
- O Server permanece beta: HTTP na LAN, sem retransmissão de áudio. Não publicar 1.0 até cumprir os critérios de `ESTADO-ECOSSISTEMA.md`.
- Roadmap e arquitetura foram corrigidos para refletir o pareamento já presente em Mobile/TV e seus limites: build passou, teste físico e autorização de host Desktop ainda faltam.

Arquivo vivo para registrar o que existe, o que mudou, verificações e trabalho pendente por aplicativo. Atualize junto a cada entrega; não marque itens apenas planejados como concluídos.

## 2026-11-20 — backup de instância e auditoria do estado publicado

- **Cobre Server:** [0.5.0-beta.3 foi publicada](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.3) com aprovação/resgate transacionais de códigos de TV e validação de corpos JSON. Os 24 testes passaram localmente e no workflow Windows; auditoria sem vulnerabilidades conhecidas; instalador, ZIP e checksums foram publicados pelo GitHub Actions. SHA-256 oficial: EXE `84a52c5833883f85adca93e0c2b5330ccb509f23ed6416406430016fc99b01ea`; ZIP `1b29073f915c0437f04654e379828846e8b8f3466d2248cd1716ce0642390e72`. A beta2 anterior já contém backup AES-256-GCM da base SQLite e `secret.key`, validação e cópia prévia de recuperação; o fluxo visual ainda não foi testado com dados reais. A API segue em HTTP sem criptografia e os clientes ainda precisam integrar e validar pareamento; o Server não está pronto para 1.0.
- **Cobre Desktop:** [3.8.0 foi publicada](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.8.0) com streaming LAN mais robusto: validação de intervalos de bytes, suporte a `HEAD`, resposta `416` para ranges inválidos e encerramento correto do fluxo interrompido; o atualizador interno inclui o novo módulo. 3/3 testes unitários, `npm audit` sem vulnerabilidades conhecidas, build Windows local, pacote interno verificado, workflow de publicação e os três checksums oficiais passaram. EXE `9a05d3f4be1040e2a72e39932d91335a0594e9c06a7ced78ef69afa1f6a90c5c`, ZIP `104f9176f51973420c9f663bd14c17107999e305908f31a1069f9d2aef71ca26`, pacote interno `3959d8fd0d31f1befcc097788a3d4fd1a386709f33db7e83e72a9f0773bd21ee`. Não foi possível testar a transmissão em aparelho Android; o comportamento real de tocar, buscar e retomar ainda precisa de confirmação no Mobile.
- **Cobre Mobile:** 0.10.0 prepara assinatura estável e agora inclui, na tela Cobre ID, autorização autenticada de código de pareamento de TV, com atualização dos dispositivos após a aprovação. A compilação Android do commit `aaaeefd` passou no [GitHub Actions](https://github.com/bruncosta077-boop/Cobre-Mobile/actions/runs/44741146291). A versão não foi publicada: faltam cadastrar a chave nos segredos, assinar e validar o APK. A TV 0.1.0 ainda não gera nem resgata códigos; portanto o fluxo entre os dois apps ainda não está concluído. O APK 0.9.0 usa certificado diferente do 0.8.0 e não atualiza por cima; não desinstale versões com dados importantes.
- **Cobre TV:** repositório público separado [Cobre-TV](https://github.com/bruncosta077-boop/Cobre-TV) criado e sincronizado com o histórico local; README/CHANGELOG e workflow de APK incluídos. Continua protótipo 0.1.0 com álbuns demonstrativos; não autentica, não consulta Desktop e não toca áudio real. Logo/banner incluídos; convite de colaborador @dilucas00 enviado.
- **Próximas prioridades para a meta 1.0:** validar backup/restauração do Server pela interface; resolver TLS com confiança compatível nos três clientes; implementar concessão autorizada de acesso ao Desktop por dispositivo; criar/testar a versão TV utilizável; cadastrar a chave estável Mobile, assinar a release e testar a migração/atualização no aparelho. Não anunciar o Server como release estável antes desses critérios.

## 2026-11-20 — diagnóstico de stream Desktop → Mobile

- O Mobile 0.8.0 mede latência até o primeiro bloco e taxa recebida durante áudio vindo do endpoint LAN do Desktop; arquivos locais ficam fora da medição.
- O heartbeat Cobre ID já aceita esses dois campos. A tela do Server agora os apresenta como diagnóstico do stream, separado da resposta do catálogo e da presença.
- Testes automatizados do Server: 16/16 passaram. O build local do APK não pôde usar o Java instalado (Java 8 selecionado; JDK embutido é 25), então o workflow Android com Java 17 compilou o APK 0.8.0 com sucesso. Artefato: execução [#14](https://github.com/bruncosta077-boop/Cobre-Mobile/actions/runs/44676045735); SHA-256 do pacote de artefatos: `46ffc5d1329d080a4113e9c318359d5cb75f62145155e7783ed883ff6d2e5bc9`.
- Limite: o Cobre Server não recebe nem retransmite áudio; reprodução continua exigindo que Desktop e Mobile estejam na mesma rede. A taxa no aparelho ainda precisa de validação prática após instalar o APK.
- Próximas prioridades: validar a medição em aparelho real; desenhar relay seguro para redes diferentes; organizar a tela de configurações do Desktop em página própria e acrescentar backup/restauração das preferências sem exportar credenciais.

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

- Repositório público [Cobre-TV](https://github.com/bruncosta077-boop/Cobre-TV) criado e sincronizado; convite de escrita para @dilucas00 enviado. O workflow `44684235826` passou após corrigir a permissão executável do `gradlew` (commit `ba39f41`).
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

## 2026-11-20 — Cobre Server 0.4.0-beta.3: contas Cobre ID pelo app

- A central do Server ganhou a seção **Contas Cobre ID** com formulário email/senha/confirmação e estado de sucesso/erro. Senhas não são mantidas no DOM após criação bem-sucedida.
- O servidor cria a conta sem simular um dispositivo; o login real do Mobile/Desktop/TV cria o respectivo aparelho no primeiro uso.
- A rota administrativa `/api/accounts` só aceita POST JSON da mesma origem do painel local, que já valida loopback, Host e Origin e permanece restrito ao próprio computador. A API pública do Cobre ID continua recusando IP de origem público.
- Testes Node 22.13.0/npm 10.9.2: 16/16 aprovados, incluindo criação local, login imediato pela API, duplicidade, tentativa de origem maliciosa e validação de email/senha. `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas. Build Windows passou. Smoke test do app empacotado confirmou painel HTTP 200, criação pela tela local e login real da conta. ZIP: SHA-256 `e902254410ef466bc76987debee1067e750f7db701fa734815033e98df174e77`; instalador: `18baf8cf02806498774daf3f2257e9a5196c9e652af07c312c7b51b6c7414d2e`. GitHub Actions concluiu e publicou [a release beta3](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.4.0-beta.3). Os dois downloads retornam HTTP 200, e o checksums SHA-256 coincide com os digests oficiais. Ainda pendente: uso em rede/dispositivos reais.

## 2026-11-20 — avanço coordenado Desktop 3.6.0 e Server 0.4.0-beta.3

### Cobre Server
- Adicionada a tela Contas Cobre ID ao aplicativo. A senha é validada e armazenada com hash scrypt; a conta é criada sem aparelho fictício e pode entrar nos clientes.
- A rota administrativa exige JSON e mesma origem; o painel segue local. Não se abriu o serviço ao acesso público.
- 16/16 testes, `npm audit` sem vulnerabilidades conhecidas, build Windows e smoke test do executável concluídos. Teste funcional isolado criou conta no painel, autenticou pela API e confirmou a versão beta3 pelo status.
- Artefatos locais beta3: ZIP SHA-256 `e902254410ef466bc76987debee1067e750f7db701fa734815033e98df174e77`; instalador `18baf8cf02806498774daf3f2257e9a5196c9e652af07c312c7b51b6c7414d2e`. Resta validar a execução do workflow de publicação e uso em rede/dispositivos reais.

### Cobre Desktop
- Removido `webSecurity: false` de todas as três janelas do Desktop. As páginas locais e as mídias passam pelo protocolo controlado `cobre://app`; CSP, allowlist de arquivos, bloqueio de navegação e popup, sandbox e contexto isolado ficam ativos.
- Atualizador interno corrigido para os dois formatos de instalação, com validação SHA-256/manifesto, seleção de arquivos, backup e rollback. Testes temporários de instalação e falha confirmaram a cópia e restauração.
- Build Windows passou; `npm audit` sem vulnerabilidades conhecidas. Smoke test reproduziu o carregamento da faixa WAV temporária por `cobre://app/media/` (200, `audio/wav`) e abriu a janela Cobre ID. O repositório ainda não tem testes automatizados (`node --test`: zero casos).
- O Cobre 3.5.0 atualmente aberto no computador é descompactado e tem o updater antigo, incapaz de instalar esta atualização. É necessário aplicar 3.6.0 uma vez pelo instalador ou ZIP; depois disso o updater novo atende futuras versões.
- Hashes locais Desktop 3.6.0: EXE `2b541e389ff0530aec121eb42616919b8a3f445207d5142b785a40466c5f594b`; ZIP portátil `11bca2341f9f39b8fa94eea91d280b44b8a8c05d9a86eae443a56258697be4d`; pacote interno `c0357821fa261ddf1e54c31a806d9f163863e866ff8e0c89f35036d443a414d3`. Os pacotes da release oficial serão reconstruídos pelo GitHub Actions. EXE sem assinatura digital.

## Publicação e checksums oficiais confirmados

- Cobre Server 0.4.0-beta.3: [release pública](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.4.0-beta.3). Instalador: `b4886e10e5ab3c4bf49282cdcb0b087b62fbf61cef256ca0c10a8eb4ad02bb94`; ZIP: `5c8dc1f55b172ceea1f25fd636224673ecd643cd7bd3caf389d110f5e35f7176`. Ambos downloads respondem HTTP 200 e os hashes batem com os digests e com o arquivo oficial de checksums.
- Cobre Desktop 3.6.0: [release pública](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.6.0). GitHub Actions passou no build e na publicação. Instalador: `eb560db2f3622002efca60b31511b7b68aa99476c14d5938d65fbe39c312c4c7`; ZIP: `cdcd6b80c4c643370837d2f67ffe0e6de26ec648fd1916d930de60949cf9cae3`; pacote interno: `31b59cf552e03f87ee30b22f7bad03f10973e446103ebc64cda04b66f9068c75`. A soma do pacote interno foi confirmada pelo download; os três arquivos da release foram publicados com `checksums-sha256.txt`.

## 2026-11-21 — Estabilidade da conexão e releases coordenadas

- Desktop 3.12.2: corrigida a versão estática que continuava mostrando 3.11.0; a interface agora consulta a versão real do executável. `npm test` passou (11/11), e os workflows oficiais de branch e tag passaram. Release: [Cobre Desktop 3.12.2](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.12.2).
- Diagnóstico do erro Mobile: o IP `192.168.15.3` do PC está na mesma rede do celular (`192.168.15.5`). Durante a inspeção, o Cobre Server não estava respondendo; ao iniciá-lo, `/health` respondeu em `127.0.0.1:8080` e `192.168.15.3:8080`. As regras de firewall dos executáveis estavam habilitadas para rede privada. Portanto o timeout observado não prova defeito no login: era compatível com serviço parado/indisponível naquele momento. O processo Server usado para a conferência foi deixado rodando para permitir novo teste local.
- Server 1.0.0 estável: fechamento da janela principal agora mantém o serviço na bandeja; menu da bandeja permite reabrir ou sair explicitamente; configuração opcional para iniciar com o Windows. Smoke test no build empacotado confirmou que a API continua saudável após fechar a janela. `npm test` passou (38/38), `npm audit --audit-level=moderate` sem vulnerabilidades conhecidas e build Windows passou. Release oficial publicada: [Cobre Server 1.0.0](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.0.0). Instalador SHA-256 `5fd7a66c9b1c04c4173c9a2c947bfce5089514ddbedbeaee735c70e5fc0ccdac`; ZIP `5c4d837c923252e58992e59f94938d87d5081a7ead5e14caba2e5706e7a32e97`.
- Mobile 0.13.1: erros de conexão agora trazem instruções em português para verificar se o Server está aberto, a rede Wi-Fi, o endereço e o firewall. Build e publicação assinada concluíram pelo workflow oficial com JDK 17. Release: [Cobre Mobile 0.13.1](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.13.1). APK SHA-256 `a4171a205c47bbfd6ae1cec023ea27220ac4e7edb85d1d23dfcdc38565966487`.
- Validação pendente que exige o aparelho físico: instalar/atualizar Mobile 0.13.1, confirmar que o Server 1.0.0 continua em execução na bandeja e testar login, lista da biblioteca Desktop e reprodução pela LAN. O Cobre Server faz identidade, autorização e presença; o áudio segue diretamente do Desktop ao Mobile, não através do Server. HTTP em LAN privada permanece uma limitação de transporte; não foi anunciado como criptografia ponta a ponta.
- Checagem final da sessão: a API local estava sem processo ativo (`127.0.0.1:8080` recusou a conexão). A tentativa de iniciar o app pelo ambiente Codex foi bloqueada; portanto, não foi possível deixar o Server aberto para o próximo teste do telefone. Isso não contradiz o smoke test isolado do pacote 1.0.0, mas significa que o computador precisa abrir o Cobre Server manualmente antes de tentar conectar.
