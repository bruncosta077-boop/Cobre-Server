# Arquitetura do ecossistema Cobre

## Responsabilidades

- **Cobre Desktop:** mantém a biblioteca local e é a origem dos arquivos de áudio.
- **Cobre Server (este repositório):** cuida da identidade Cobre ID, sessões, dispositivos e aprovação de pareamento. É o ponto de coordenação entre os clientes.
- **Cobre Mobile e Cobre TV:** clientes que poderão localizar e acessar um Desktop autorizado.

O áudio deve sair diretamente do Desktop para o aparelho pela rede local. O Cobre Server não deve receber nem retransmitir a biblioteca. Isso evita transformar o servidor de identidade em um relay de mídia e reduz o tráfego central.

## O que o código atual faz

O serviço registra contas e dispositivos, autentica clientes, renova e revoga sessões, recebe presença e oferece endpoints para solicitar um código de TV e aprová-lo por outro dispositivo autenticado. O Mobile implementa a aprovação; o TV 0.2.0 solicita e resgata o código, guardando o refresh token no Android Keystore. Os clientes compilam, mas o pareamento ainda não foi validado em aparelhos reais. O registro de presença informa somente que um aparelho enviou um heartbeat recentemente.

O servidor local embutido no Desktop ainda usa seu próprio contrato de biblioteca e streaming. No Server, a API de concessão por host está sendo preparada: o Mobile solicita acesso, o Desktop autenticado lista e aprova/recusa o pedido, o Mobile recebe uma permissão curta e o host pode validá-la ou revogá-la. Essa base ainda não está integrada ao Desktop/Mobile; portanto, ela não concede acesso ao catálogo ou ao áudio até os clientes chamarem e aplicarem as rotas. A TV permanece com biblioteca de demonstração e sem reprodução de áudio.

O Cobre Server é um aplicativo desktop Electron. A janela usa o painel local em `127.0.0.1:8788`, iniciado junto da API. O painel consulta contas e presença sem expor a interface administrativa à rede. A métrica de resposta mede a chamada local à API; não é latência do streaming. Taxa e estabilidade do áudio dependem de medições reportadas pelos clientes. A partir da 0.5.0-beta.1, a interface exporta e restaura a base e a chave em um arquivo autenticado e criptografado por senha.

A partir da 0.5.0-beta.5, Configurações pode importar um certificado e uma chave privada PEM; ambos são conferidos antes de salvar. Quando configurado, o serviço atende somente por HTTPS na porta da API, sem manter HTTP paralelo. A confiança continua sendo responsabilidade do certificado e do sistema operacional do cliente; certificados autoassinados não são aceitos automaticamente. Desativar HTTPS volta explicitamente para HTTP.

Desde a beta 0.4.0-beta.2, a API ainda faz bind para receber conexões LAN, mas recusa pedidos com origem fora de loopback e faixas privadas IPv4/IPv6. Em HTTP, isso não cifra o tráfego: senhas e tokens ainda podem ser observados dentro da própria rede local. A configuração HTTPS elimina esse risco somente quando o cliente valida uma cadeia confiável e o nome do certificado corresponde ao endereço.

## Diagnóstico de conexão planejado

Para mostrar estado real, latência e velocidade, cada medição precisa vir do trecho que realmente conhece a conexão:

1. O **Mobile/TV** mede se alcança o Desktop e estima latência e taxa recebida ao ler um trecho de áudio.
2. O **Desktop** registra o aparelho autorizado e os bytes enviados por sessão.
3. O **Cobre Server** coordena identidade, autorização e presença; recebe apenas métricas agregadas necessárias, nunca arquivos de áudio.
4. A interface do Cobre Server poderá mostrar aparelhos conectados, host associado, último heartbeat, latência, taxa recente e erros, com consentimento e retenção curta.

Uma presença `online` sozinha não é evidência de que o Desktop aceita streaming. O produto deve separar `conta ativa`, `Desktop visível na LAN` e `stream de áudio testado`.

## Segurança

- Tokens curtos e renovação rotativa ficam limitados ao dispositivo autenticado.
- Cada concessão de acesso aponta para um Desktop específico, carrega escopos, expira e pode ser revogada no Server. O Desktop ainda precisa validar a permissão em cada rota protegida.
- Nenhum segredo do servidor deve ser enviado a clientes.
- Credenciais não devem aparecer em query strings ou logs.
- HTTPS é obrigatório para qualquer instância acessível pela internet.
- Métricas devem excluir conteúdo pessoal, caminhos locais e nomes de arquivos.
