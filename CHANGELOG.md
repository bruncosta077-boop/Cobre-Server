# Histórico de versões — Cobre Server

## 0.5.0-beta.5 — HTTPS configurável

- A tela Configurações importa certificado e chave privada PEM, confere validade e correspondência e guarda os arquivos no perfil local do Windows.
- Com HTTPS ativado, a API passa a aceitar conexões somente por HTTPS na porta atual. O app mostra os endereços com o protocolo certo e reinicia após ativar/desativar.
- Os clientes precisam usar um endereço coberto por certificado confiável pelo sistema. Certificados autoassinados não são aceitos automaticamente; a configuração não altera as URLs já salvas nos outros aplicativos.
- A validação inclui teste de ponta a ponta do endpoint `/health` em HTTPS com certificado de teste gerado no Windows.
- O Server ainda precisa de validação física com os clientes e segue sem retransmitir áudio.

## 0.5.0-beta.4 — atualizações dentro do aplicativo

- A página Configurações agora verifica releases, apresenta as notas, baixa o instalador oficial para Windows x64 e abre a instalação após confirmação.
- O download aceita apenas o ativo da release oficial do Cobre Server no GitHub, limita o tamanho, segue somente redirecionamentos HTTPS permitidos e valida o SHA-256 antes de liberar o instalador.
- O hash é conferido novamente imediatamente antes de abrir o arquivo. Atualizar por cima mantém a base e a chave no perfil `%APPDATA%`; o instalador ainda solicita a confirmação normal do Windows.
- Testes automatizados cobrem ordem de versões, seleção do instalador, redirecionamentos, checksum correto/adulterado e descarte de arquivo inválido.
- Continua beta: API LAN HTTP sem criptografia; TLS e validação do pareamento em aparelhos reais continuam pendentes.

Todas as alterações relevantes são registradas aqui. O histórico geral do ecossistema fica em [`docs/REGISTRO-DE-TRABALHO.md`](docs/REGISTRO-DE-TRABALHO.md).

## 0.5.0-beta.3 — pareamento Cobre TV mais seguro

- Aprovação e resgate de códigos de dispositivo agora são operações transacionais: pedidos simultâneos não podem criar dispositivos duplicados nem emitir duas sessões para o mesmo código de TV.
- JSON válido precisa ser um objeto; arrays, valores escalares e `null` são recusados com erro 400 claro.
- Testes exercitam autorização aprovada, recusada, consumo único e corrida simultânea entre requisições.
- 24/24 testes passam e a auditoria não reporta vulnerabilidades conhecidas.
- Continua beta: a API da LAN usa HTTP sem criptografia, não retransmite áudio e ainda depende de validação e integração dos clientes reais. A TV permanece protótipo.

## 0.5.0-beta.2 — recuperação mais segura

- Se a substituição de dados falhar após o encerramento do serviço, remove arquivos temporários abertos e reinicia a aplicação usando a cópia criptografada prévia como recuperação.
- O build beta2 inclui todas as funções de backup/restauração da beta1.
- Continua beta: API da LAN usa HTTP sem criptografia, clientes ainda não completam pareamento e integração autorizada ao Desktop e falta teste visual de restauração com dados reais.

## 0.5.0-beta.1 — cópia de segurança criptografada

- Configurações agora permitem exportar e restaurar contas, dispositivos, sessões e chave desta instância em arquivo protegido por senha.
- A restauração valida autenticação e integridade SQLite antes de pedir confirmação; cria cópia criptografada dos dados atuais ao lado do arquivo escolhido e reinicia a instância.
- O backup usa AES-256-GCM e derivação scrypt; exige senha de 12 a 256 caracteres. O limite do banco é 128 MB.
- Inclui testes automatizados de conteúdo, senha incorreta, adulteração e dados inválidos.
- Continua beta: API da LAN usa HTTP sem criptografia; transmissão de mídia não passa pelo Server; falta validar a experiência de backup/restauração na interface Windows com dados reais.

## 0.4.0-beta.4 — diagnóstico de áudio medido pelo Mobile

- Painel distingue taxa real recebida e latência inicial do áudio da latência do catálogo.
- As medições vêm do Cobre Mobile durante reprodução de faixas do Desktop; heartbeat sem stream não é apresentado como transmissão.
- O Server continua coordenando contas/presença, sem receber nem retransmitir áudio; o stream segue direto pela rede local.

## 0.4.0-beta.3 — criação local de contas Cobre ID

- O painel do Cobre Server agora cria contas Cobre ID com email e senha, sem cadastrar um aparelho fictício.
- A conta fica pronta para login no Desktop, Mobile e TV; senha confirmada na interface e validada no serviço.
- A criação só aceita pedido JSON da mesma origem do painel local, que continua restrito a loopback.
- A API segue recusando conexões de origem pública. HTTP na LAN continua sem criptografia.

## 0.4.0-beta.2 — revisão de segurança em validação

- A API recusa, por padrão, conexões de origem fora de loopback e redes locais privadas, mesmo quando a porta está encaminhada para a internet.
- Cobertos endereços IPv4 privados, loopback, link-local, IPv6 ULA e endereços IPv4 mapeados em IPv6.
- A suíte atual tem 15 testes aprovados; a compilação e o uso em uma LAN real ainda precisam de validação antes de promover a beta.
- HTTP na rede local continua sem criptografia; mantenha a instância em Wi-Fi confiável e não use como servidor público.

## 0.4.0-beta.1 — pré-lançamento para validação

- Aplicativo desktop Electron para Windows com painel de visão geral, dispositivos, conexões, configurações e notas da versão.
- Pacotes portáteis ZIP e instalador NSIS automatizados pelo GitHub Actions.
- Logo e ícone oficiais do Cobre incorporados ao aplicativo.
- Cadastro agora valida o tipo de dispositivo antes de gravar a conta, evitando contas incompletas.
- Inicialização agora falha de forma segura se `secret.key` estiver truncada ou inválida, em vez de assinar tokens com chave fraca.
- Empacotamento do Windows impede publicação implícita do electron-builder; publicar release é uma etapa explícita e separada do workflow.
- Dashboard distingue presença Cobre ID de streaming de mídia e usa filtragem/pesquisa de dispositivos.
- Metadados de presença usam lista permitida; campos arbitrários, caminhos e segredos são descartados.
- Os testes ficaram independentes de tokens de acesso de 1 segundo e confirmam expiração em instância isolada.
- Testes locais: 13 passaram; `npm audit --audit-level=moderate` retornou zero vulnerabilidades conhecidas.
- Empacotamento Windows x64 validado localmente; o comando fixa `--publish never` para separar geração do pacote e publicação da release.
- Teste automatizado do painel confirma logo disponível, headers de proteção e bloqueio de Host/Origin não permitidos.
- Inclui contribuições de [@dilucas00](https://github.com/dilucas00).

### Limites conhecidos

- Integração atual é Cobre ID, sessões, pareamento inicial e presença. Descoberta e autorização efetiva do Desktop por aparelho ainda não foram finalizadas.
- A API usa HTTP para a rede local; não exponha portas à internet sem TLS e uma arquitetura de autenticação revisada.
- A taxa contínua do áudio só será exibida quando Desktop e Mobile/TV reportarem medições verificáveis.
- O binário ainda não é assinado digitalmente e a atualização dentro do aplicativo está pendente.

## 0.3.0

- Painel administrativo local para saúde da API, contas e dispositivos.
- Painel restrito a loopback; API de identidade disponível na rede local.
