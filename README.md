# Cobre Server

Serviço central do ecossistema Cobre para contas Cobre ID, sessões, dispositivos e pareamento. Repositório separado do Desktop e dos clientes Mobile/TV.

## Estado atual

- Versão: **0.2.0**.
- API HTTP em Node.js, sem dependências npm externas; requer Node **22.13 ou superior**.
- Contas, login, sessões com renovação rotativa, dispositivos, presença e aprovação inicial de códigos de pareamento.
- Testes automatizados cobrem os fluxos atuais da API.
- Ainda não entrega áudio, não dá acesso à biblioteca de um Desktop específico e não mede velocidade/latência de streaming.
- Ainda não tem painel visual para acompanhar conexões. A proposta e as etapas estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Executar no Windows

Com Node 22.13 ou superior:

```bat
Iniciar Cobre ID.bat
```

Ou manualmente:

```sh
node server.js
```

Por padrão, o serviço usa a porta `8080`. Configure `PORT`, `HOST` e `DATA_DIR` para mudar os valores. O serviço deve permanecer acessível aos clientes enquanto estiver em uso.

## Verificar

```sh
node --test test/server.test.js
```

## Rotas implementadas

- `POST /v1/register`, `/v1/login`, `/v1/refresh` e `/v1/logout`.
- `GET /v1/devices`, `DELETE /v1/devices/:id` e `POST /v1/presence`.
- `POST /v1/device/authorization`, `/v1/device/authorize` e `/v1/device/token` para o pareamento inicial por código.

## Dados e segurança

Os dados operacionais ficam em `data/`, incluindo o banco e a chave de assinatura. Essa pasta está excluída do Git. **Nunca envie o banco, a chave `secret.key`, tokens ou credenciais para o repositório.** Faça cópia de segurança da chave em local privado; perder a chave invalida as sessões existentes.

O serviço atual fala HTTP. Antes de expô-lo à internet, precisa ficar atrás de HTTPS e receber uma revisão de configuração. A presença indica atividade recente do dispositivo; não prova que ele está alcançável nem mede a conexão de áudio.

## Licença

Este código não declara uma licença de redistribuição. Consulte o autor antes de reutilizar ou redistribuir.
