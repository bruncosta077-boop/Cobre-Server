<div align="center">

# Cobre Server

**O centro de identidade e conexão do ecossistema Cobre.**

Aplicativo desktop para Windows · Cobre ID · Dispositivos · Diagnóstico local

[Baixar para Windows](../../actions/workflows/build-windows.yml) · [Arquitetura](docs/ARQUITETURA.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

## O que é

O Cobre Server é um **aplicativo desktop independente** que mantém os serviços locais do Cobre ID ativos e oferece uma central visual para acompanhar contas, dispositivos e estado do serviço. Ele foi desenhado para fazer parte do Cobre Desktop, Mobile e da futura versão para Google TV / Android TV.

Não é uma página hospedada nem um serviço de streaming de áudio. Ao abrir o programa, uma janela própria do Cobre Server aparece e a API fica disponível na rede local para os clientes autorizados.

## Baixar o aplicativo

O pacote Windows é gerado automaticamente pelo GitHub Actions a cada atualização publicada na branch principal:

1. Abra **Actions** neste repositório.
2. Entre em **Build Cobre Server para Windows** e abra a execução mais recente concluída.
3. Na seção **Artifacts**, baixe **Cobre-Server-Windows-x64**.
4. Extraia o ZIP e abra **Cobre Server.exe**.

O ZIP é portátil e não exige Node.js instalado. O workflow também gera um instalador Windows. A primeira inicialização cria o banco e a chave local na pasta de dados do usuário do Windows.

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

O aplicativo escuta a API em `0.0.0.0:8080` para que os clientes da rede local possam acessá-la; o painel administrativo local usa `127.0.0.1:8788` e não é publicado na rede. Os dados da instância ficam em `%APPDATA%\Cobre Server\data`, incluindo banco e chave de assinatura. **Não compartilhe essa pasta.** Perder a chave invalida as sessões existentes.

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
