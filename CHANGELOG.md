# Histórico de versões — Cobre Server

Todas as alterações relevantes são registradas aqui. O histórico geral do ecossistema fica em [`docs/REGISTRO-DE-TRABALHO.md`](docs/REGISTRO-DE-TRABALHO.md).

## 0.4.0-beta.1 — pré-lançamento para validação

- Aplicativo desktop Electron para Windows com painel de visão geral, dispositivos, conexões, configurações e notas da versão.
- Pacotes portáteis ZIP e instalador NSIS automatizados pelo GitHub Actions.
- Logo e ícone oficiais do Cobre incorporados ao aplicativo.
- Cadastro agora valida o tipo de dispositivo antes de gravar a conta, evitando contas incompletas.
- Inicialização agora falha de forma segura se `secret.key` estiver truncada ou inválida, em vez de assinar tokens com chave fraca.
- Dashboard distingue presença Cobre ID de streaming de mídia e usa filtragem/pesquisa de dispositivos.
- Metadados de presença usam lista permitida; campos arbitrários, caminhos e segredos são descartados.
- Os testes ficaram independentes de tokens de acesso de 1 segundo e confirmam expiração em instância isolada.
- Testes locais: 12 passaram; `npm audit --audit-level=moderate` retornou zero vulnerabilidades conhecidas.
- Empacotamento Windows x64 validado; ZIP portátil e instalador gerados localmente. Os hashes de cada arquivo acompanham a release.
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
