# Segurança do Cobre Server

## Modelo atual

- Senhas são derivadas com `scrypt`; sessões curtas usam access token assinado e refresh token rotativo armazenado como hash.
- A chave de assinatura é gerada localmente e os arquivos de dados ficam fora do repositório.
- A inicialização exige uma chave de 32 bytes válida; se `secret.key` estiver truncada ou malformada, o serviço para em vez de usar uma chave fraca.
- O painel administrativo vincula-se a `127.0.0.1`, valida origem/Host e usa CSP sem scripts remotos.
- A API verifica o endereço IP de origem e, por padrão, aceita somente loopback, faixas IPv4 privadas, IPv6 ULA e link-local. Endereços públicos são recusados mesmo se a porta for encaminhada no roteador.
- A janela Electron desativa Node.js no renderer, usa `contextIsolation` e `sandbox`, bloqueia janelas externas e navegação fora do painel.
- Metadados de presença são limitados a versão, plataforma e números de diagnóstico permitidos. Caminhos de arquivos e credenciais são rejeitados.
- Os endpoints de autenticação têm limites de tentativas e os códigos temporários de pareamento expiram.
- O HTTPS opcional usa certificado e chave PEM importados pela interface, verifica a correspondência e validade e não mantém uma porta HTTP paralela. As chaves TLS ficam fora do repositório, no perfil local.

## Restrições importantes

O Cobre Server atual atende a uma rede privada confiável. A API aceita HTTP por padrão para facilitar o uso entre aparelhos na LAN; credenciais e tokens podem ser observados por alguém com acesso à rede Wi-Fi. HTTPS opcional cifra o transporte quando os clientes confiam na cadeia e no nome do certificado. Mesmo com HTTPS, a configuração atual não habilita acesso pela internet: origens públicas continuam recusadas. O filtro de IP reduz exposição acidental, mas não substitui uma política de firewall. Não use Wi-Fi público e não trate um heartbeat como autorização para reproduzir mídia.

Antes de acesso remoto pela internet, a integração ainda precisa de autorização curta por host/aparelho, escopos separados, revogação testada e validação de proxy confiável. O segredo de assinatura jamais pode ser compartilhado com os clientes.

## Dados locais

O banco SQLite e `secret.key` ficam em `%APPDATA%\Cobre Server\data`. O banco não é criptografado em repouso; proteja o acesso ao Windows e mantenha cópia de segurança privada. A chave não deve ser enviada a Issues, mensagens, logs ou commits. Apagar ou perder a chave invalida sessões existentes.

## Relatar problemas

Abra uma Issue privada/contate o mantenedor antes de publicar detalhes que possam permitir acesso às contas ou sessões. Não anexe banco, tokens, senha, endereço IP público ou chave de assinatura.
