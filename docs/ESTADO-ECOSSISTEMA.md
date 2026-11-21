# Estado do ecossistema Cobre

Atualizado em 2026-11-21. Versões publicadas e estado de integração são registrados separadamente; uma compilação verde não comprova alcance de rede em todos os aparelhos.

| Aplicativo | Último lançamento publicado | Estado do código | Atualização e preservação de dados |
| --- | --- | --- | --- |
| [Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.12.2) | 3.12.2 estável | Versão mostrada na interface vem do executável; streaming local protegido por concessões | Atualizador interno conserva os dados e valida SHA-256; backup/rollback do pacote. |
| [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.14.0) | 0.14.0 pré-release (APK assinado) | Biblioteca local/Computador/Tudo mais clara; integração existente com Cobre ID, autorização, catálogo LAN e reprodução direta preservada | APK assinado com a chave estável; instalação e atualização por cima precisam continuar sendo validadas no aparelho. |
| [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.1.0) | 1.1.0 (atualização do painel) | Mostra endereço copiável e separa presença Cobre ID, Desktop, Mobile e medições de áudio; mantém API ativa na bandeja e pode iniciar com o Windows | Instalador/ZIP mantêm dados em `%APPDATA%`; exportação criptografada permite recuperação. |
| [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) | Sem release publicada | Código 0.3.0 compila e já lista Desktops, pede autorização, consulta biblioteca/capas e toca stream direto do Desktop; ainda sem teste físico | Só há APK debug de desenvolvimento. Não há assinatura estável nem pacote de distribuição. |

## Regras para atualizar sem perder configuração

- **Desktop e Server:** atualizar por cima com os pacotes oficiais; não apagar as pastas de dados do usuário. No Server, exportar periodicamente `Cobre-Server-backup` e guardar a senha separadamente.
- **Mobile:** releases futuras assinadas com a mesma chave podem atualizar por cima. Antes da primeira migração do APK debug para a versão assinada, fazer backup dos dados; a troca de assinatura pode exigir desinstalação e não é transparente. **TV:** ainda não possui canal assinado. Remover qualquer um dos apps apaga seus dados privados.
- Tokens protegidos pelo Android Keystore não devem ser copiados em backups portáteis. Depois de reinstalar ou trocar de aparelho, pode ser necessário autenticar novamente no Cobre ID e conceder acesso à pasta de música.

## Verificações práticas pendentes

1. Validar o fluxo completo da TV 0.3.0 em Android TV/Google TV físico: pareamento, aprovação, catálogo, capas e áudio com seek.
2. Confirmar reprodução da biblioteca Desktop no Mobile 0.14.0 em diferentes redes locais e depois de interrupção/reconexão.
3. Validar a restauração criptografada do Server pela interface Windows com uma instância descartável.
4. Configurar e validar certificado TLS confiável se o uso sair de uma rede privada confiável.
5. Confirmar atualização assinada do Mobile por cima da versão instalada e preservação dos dados.

Essas verificações acompanham compatibilidade e uso real; não alteram o papel do Cobre Server 1.1.0 como serviço local de identidade, presença e autorização.
