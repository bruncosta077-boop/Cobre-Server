# Arquitetura do ecossistema Cobre

## Responsabilidades

- **Cobre Desktop:** mantém a biblioteca local e é a origem dos arquivos de áudio.
- **Cobre Server (este repositório):** cuida da identidade Cobre ID, sessões, dispositivos e aprovação de pareamento. É o ponto de coordenação entre os clientes.
- **Cobre Mobile e Cobre TV:** clientes que solicitam autorização para acessar um Desktop; ambos usam concessões por dispositivo para catálogo e áudio direto do host.

O áudio deve sair diretamente do Desktop para o aparelho pela rede local. O Cobre Server não deve receber nem retransmitir a biblioteca. Isso evita transformar o servidor de identidade em um relay de mídia e reduz o tráfego central.

## O que o código atual faz

O serviço registra contas e dispositivos, autentica clientes, renova e revoga sessões, recebe presença e oferece endpoints para pareamento e autorização. Mobile e TV podem pedir acesso a um Desktop; o Desktop aprova ou recusa e o Server emite a concessão. A presença informa que um aparelho enviou um heartbeat recentemente; ela não confirma, sozinha, que o catálogo ou o áudio estão acessíveis.

O serviço local do Desktop responde em sua porta LAN própria e valida as concessões do Server nas rotas protegidas. A aprovação cria consentimento revogável de 30 dias; Mobile e TV recebem tokens curtos e os renovam com a sessão Cobre ID enquanto o consentimento estiver ativo. A biblioteca, as capas e o áudio seguem diretamente do Desktop ao Mobile ou à TV; o Server não recebe arquivos. A TV 0.4.0 integra descoberta local, autorização, catálogo e reprodução direta; presença periódica e métricas de stream estão em desenvolvimento em 0.5.0, ainda sem validação em televisão física.

O Cobre Server é um aplicativo desktop Electron. A janela usa o painel local em `127.0.0.1:8788`, iniciado junto da API. Fechar a janela mantém os serviços ativos na área de notificação; o início com o Windows pode ser habilitado nas configurações. O painel consulta contas e presença sem expor a interface administrativa à rede. A métrica de resposta mede a chamada local à API; não é latência do streaming. Taxa e latência inicial são medidas pelo cliente que recebe o áudio e reportadas no heartbeat; o painel deve mostrar a idade e a origem (Mobile ou TV). A interface exporta e restaura a base e a chave em um arquivo autenticado e criptografado por senha.

A partir da 0.5.0-beta.5, Configurações pode importar um certificado e uma chave privada PEM; ambos são conferidos antes de salvar. Quando configurado, o serviço atende somente por HTTPS na porta da API, sem manter HTTP paralelo. A confiança continua sendo responsabilidade do certificado e do sistema operacional do cliente; certificados autoassinados não são aceitos automaticamente. Desativar HTTPS volta explicitamente para HTTP.

Desde a beta 0.4.0-beta.2, a API ainda faz bind para receber conexões LAN, mas recusa pedidos com origem fora de loopback e faixas privadas IPv4/IPv6. Em HTTP, isso não cifra o tráfego: senhas e tokens ainda podem ser observados dentro da própria rede local. A configuração HTTPS elimina esse risco somente quando o cliente valida uma cadeia confiável e o nome do certificado corresponde ao endereço.

## Diagnóstico de conexão

Para mostrar estado real, latência e velocidade, cada medição precisa vir do trecho que realmente conhece a conexão:

1. O **Mobile/TV** mede se alcança o Desktop e estima latência e taxa recebida ao ler um trecho de áudio.
2. O **Desktop** registra o aparelho autorizado e os bytes enviados por sessão.
3. O **Cobre Server** coordena identidade, autorização e presença; recebe apenas métricas agregadas reportadas pelos clientes, nunca arquivos de áudio.
4. A interface do Cobre Server mostra aparelhos conectados, host associado, último heartbeat, latência de catálogo e medidas recentes de áudio informadas pelo Mobile ou pela TV.

Uma presença `online` sozinha não é evidência de que o Desktop aceita streaming. O produto deve separar `conta ativa`, `Desktop visível na LAN` e `stream de áudio testado`.

## Segurança

- Tokens curtos e renovação rotativa ficam limitados ao dispositivo autenticado.
- Cada concessão de acesso aponta para um Desktop específico, carrega escopos, expira e pode ser revogada no Server. O Desktop ainda precisa validar a permissão em cada rota protegida.
- Nenhum segredo do servidor deve ser enviado a clientes.
- Credenciais não devem aparecer em query strings ou logs.
- HTTPS é obrigatório para qualquer instância acessível pela internet.
- Métricas devem excluir conteúdo pessoal, caminhos locais e nomes de arquivos.
