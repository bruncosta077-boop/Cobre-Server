# Histórico de versões — Cobre Server

Todas as alterações relevantes são registradas aqui. O histórico geral do ecossistema fica em [`docs/REGISTRO-DE-TRABALHO.md`](docs/REGISTRO-DE-TRABALHO.md).

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
