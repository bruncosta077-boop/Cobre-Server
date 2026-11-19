<div align="center">

  <img src="docs/images/cobre-logo-dark.svg" alt="Logo do Cobre" width="180">

# Cobre Server

**O centro de identidade e conexão do ecossistema Cobre.**

Aplicativo desktop para Windows · Cobre ID · Dispositivos · Diagnóstico local

[Baixar a beta para Windows](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.4.0-beta.2) · [Arquitetura](docs/ARQUITETURA.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

## O que é

O Cobre Server é um **aplicativo desktop independente** que mantém os serviços locais do Cobre ID ativos e oferece uma central visual para acompanhar contas, dispositivos e estado do serviço. Ele foi desenhado para fazer parte do Cobre Desktop, Mobile e da futura versão para Google TV / Android TV.

Não é uma página hospedada nem um serviço de streaming de áudio. Ao abrir o programa, uma janela própria do Cobre Server aparece e a API fica disponível na rede local para os clientes autorizados.

## Créditos

Projeto de Bruno C S Moraes, com contribuições de [@dilucas00](https://github.com/dilucas00).

## Baixar o aplicativo

O pacote atual é uma **pré-release beta**, não a versão estável 1.0.0. Na página da release, estão disponíveis o [ZIP portátil](https://github.com/bruncosta077-boop/Cobre-Server/releases/download/v0.4.0-beta.2/Cobre-Server-0.4.0-beta.2-Windows-x64.zip), o [instalador Windows](https://github.com/bruncosta077-boop/Cobre-Server/releases/download/v0.4.0-beta.2/Cobre-Server-0.4.0-beta.2-Windows-x64.exe) e os [checksums SHA-256](https://github.com/bruncosta077-boop/Cobre-Server/releases/download/v0.4.0-beta.2/checksums-sha256.txt). Compare o hash do arquivo antes de abrir.

O ZIP não exige Node.js instalado. A primeira inicialização cria o banco e a chave local na pasta de dados do usuário do Windows. Leia [Segurança e dados](#seguranca-e-dados) antes de permitir conexões na rede.

## O que a central mostra

- Estado do serviço e número de contas Cobre ID.
- Dispositivos vinculados, tipo, plataforma, versão e último heartbeat.
- Filtros de aparelhos online/offline e busca.
- Tempo de resposta da API local e endereços/portas usados.
- Diagnóstico explicando presença da conta versus streaming real.
- Atalho para abrir a pasta de dados e opção segura para encerrar o servidor.

O aplicativo atual **não mede taxa de áudio nem retransmite músicas**. Essas medidas só poderão ser exibidas quando os clientes Desktop e Mobile/TV as reportarem.

## Como os aplicativos se conectam

```text
Cobre Desktop ───────────────► Cobre Mobile / Google TV
      │                           ▲
      └──── identidade e presença ─┤
                                  │
                           Cobre Server
```

O Cobre Server coordena contas, sessões, dispositivos e pareamento. O Desktop deve continuar sendo a origem da biblioteca; o áudio é transmitido diretamente ao aparelho na rede local. Consulte [a arquitetura detalhada](docs/ARQUITETURA.md) para limites e etapas que ainda faltam.

## Executar em desenvolvimento

Requer Node.js 22.13 ou superior.

```powershell
npm install
npm run app
```

Para criar localmente o instalador e ZIP:

```powershell
npm run dist:win
```

Os artefatos aparecem em `release/`. Para iniciar somente a API em modo de desenvolvimento: `npm start`.

## Verificação

```powershell
npm test
```

## Segurança e dados

O aplicativo escuta a API em `0.0.0.0:8080` para que os clientes da rede local possam acessá-la, mas recusa conexões cujo IP de origem não seja loopback ou uma faixa local privada. O painel administrativo usa `127.0.0.1:8788` e não é publicado na rede. Essa barreira reduz exposição acidental, mas não substitui HTTPS, firewall ou segurança do roteador. Os dados da instância ficam em `%APPDATA%\Cobre Server\data`, incluindo banco e chave de assinatura. **Não compartilhe essa pasta.** Perder a chave invalida as sessões existentes.

O serviço atual usa HTTP. Não exponha uma instância à internet sem HTTPS e uma revisão de implantação. Estado “online” significa heartbeat recente; não comprova que o Desktop está acessível nem que o áudio está tocando.

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `server.js` | API Cobre ID, autenticação, pareamento e presença |
| `electron-main.js`, `preload.js` | Janela desktop, ciclo de vida e ações locais seguras |
| `dashboard/` | Interface de gerenciamento embutida no aplicativo |
| `dashboard.js` | Servidor local do painel e endpoint de status |
| `test/` | Testes automatizados da API |
| `docs/` | Arquitetura e roadmap do ecossistema |
| `.github/workflows/` | Empacotamento Windows e publicação de artefatos |

## Licença

Este repositório não declara uma licença de redistribuição. Consulte o autor antes de reutilizar o código.
