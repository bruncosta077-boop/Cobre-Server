# Cobre Server

Serviço central do ecossistema Cobre para contas Cobre ID, sessões, dispositivos e pareamento. Repositório separado do Desktop e dos clientes Mobile/TV.

## Estado atual

- Versão: **0.3.0**.
- API HTTP em Node.js, sem dependências npm externas; requer Node **22.13 ou superior**.
- Contas, login, sessões com renovação rotativa, dispositivos, presença e aprovação inicial de códigos de pareamento.
- Painel local no navegador para saúde do serviço, contas, aparelhos vinculados e presença recente.
- O painel fica restrito a `127.0.0.1:8788`; a API de Cobre ID continua na porta `8080` e acessível pela rede local.
- Não entrega áudio e não inventa métricas de streaming. O painel diferencia presença Cobre ID da conexão direta Desktop–Mobile/TV.

## Executar no Windows

Com Node 22.13 ou superior:

```bat
Iniciar Cobre Server.bat
```

O comando inicia a API e o painel, que abre em `http://127.0.0.1:8788`. Para parar, feche a janela do serviço.

Ou manualmente:

```sh
node server.js
```

Por padrão, a API usa a porta `8080` e o painel local a `8788`. Configure `PORT`, `HOST`, `DASHBOARD_PORT` e `DATA_DIR` para mudar os valores. O serviço deve permanecer acessível aos clientes enquanto estiver em uso.

## Verificar

```sh
node --test test/server.test.js
```

## Rotas implementadas

- `POST /v1/register`, `/v1/login`, `/v1/refresh` e `/v1/logout`.
- `GET /v1/devices`, `DELETE /v1/devices/:id` e `POST /v1/presence`.
- `POST /v1/device/authorization`, `/v1/device/authorize` e `/v1/device/token` para o pareamento inicial por código.
- `GET /health` para estado básico do serviço.

## Dados e segurança

Os dados operacionais ficam em `data/`, incluindo o banco e a chave de assinatura. Essa pasta está excluída do Git. **Nunca envie o banco, a chave `secret.key`, tokens ou credenciais para o repositório.** Faça cópia de segurança da chave em local privado; perder a chave invalida as sessões existentes.

O serviço atual fala HTTP. Antes de expô-lo à internet, precisa ficar atrás de HTTPS e receber uma revisão de configuração. O painel só aceita conexões do próprio computador e não mostra segredos de sessão. Presença indica atividade recente do dispositivo; não prova que o computador está alcançável nem mede a conexão de áudio.

## Licença

Este código não declara uma licença de redistribuição. Consulte o autor antes de reutilizar ou redistribuir.
