# Arquitetura do ecossistema Cobre

## Responsabilidades

- **Cobre Desktop:** mantém a biblioteca local e é a origem dos arquivos de áudio.
- **Cobre Server (este repositório):** cuida da identidade Cobre ID, sessões, dispositivos e aprovação de pareamento. É o ponto de coordenação entre os clientes.
- **Cobre Mobile e Cobre TV:** clientes que poderão localizar e acessar um Desktop autorizado.

O áudio deve sair diretamente do Desktop para o aparelho pela rede local. O Cobre Server não deve receber nem retransmitir a biblioteca. Isso evita transformar o servidor de identidade em um relay de mídia e reduz o tráfego central.

## O que o código atual faz

O serviço registra contas e dispositivos, autentica clientes, renova e revoga sessões, recebe presença e permite que o Desktop aprove um código inicial de pareamento. O registro de presença informa que um aparelho enviou um heartbeat recentemente.

O servidor local embutido no Desktop ainda usa seu próprio contrato de biblioteca e streaming. A integração por Cobre ID ainda não concede a um Mobile/TV acesso a um Desktop específico. O fluxo completo de solicitação e consulta do código também precisa ser implementado nos clientes.

O Cobre Server 0.4.0 é um aplicativo desktop Electron. A janela usa o painel local em `127.0.0.1:8788`, iniciado junto da API. O painel consulta contas e presença sem expor a interface administrativa à rede. A métrica de resposta mede a chamada local à API; não é latência do streaming. Taxa e estabilidade do áudio ainda dependem de medições reportadas pelos clientes.

## Diagnóstico de conexão planejado

Para mostrar estado real, latência e velocidade, cada medição precisa vir do trecho que realmente conhece a conexão:

1. O **Mobile/TV** mede se alcança o Desktop e estima latência e taxa recebida ao ler um trecho de áudio.
2. O **Desktop** registra o aparelho autorizado e os bytes enviados por sessão.
3. O **Cobre Server** coordena identidade, autorização e presença; recebe apenas métricas agregadas necessárias, nunca arquivos de áudio.
4. A interface do Cobre Server poderá mostrar aparelhos conectados, host associado, último heartbeat, latência, taxa recente e erros, com consentimento e retenção curta.

Uma presença `online` sozinha não é evidência de que o Desktop aceita streaming. O produto deve separar `conta ativa`, `Desktop visível na LAN` e `stream de áudio testado`.

## Segurança

- Tokens curtos e renovação rotativa ficam limitados ao dispositivo autenticado.
- Cada concessão de acesso deve apontar para um Desktop específico e ser revogável.
- Nenhum segredo do servidor deve ser enviado a clientes.
- Credenciais não devem aparecer em query strings ou logs.
- HTTPS é obrigatório para qualquer instância acessível pela internet.
- Métricas devem excluir conteúdo pessoal, caminhos locais e nomes de arquivos.
