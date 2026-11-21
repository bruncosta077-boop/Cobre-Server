# Estado do ecossistema Cobre

Atualizado em 2026-11-21. Versões publicadas e estado de integração são registrados separadamente; uma compilação verde não comprova alcance de rede em todos os aparelhos.

| Aplicativo | Último lançamento publicado | Estado do código | Atualização e preservação de dados |
| --- | --- | --- | --- |
| [Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.13.0) | 3.13.0 estável | Descoberta local por mDNS; consentimento Cobre ID e stream protegido permanecem separados | Instalador, ZIP portátil e pacote interno publicados com checksums. |
| [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.15.0) | 0.15.0 pré-release (APK assinado) | Descobre Desktop localmente, mantém QR/manual, bibliotecas local/remota e reprodução direta; código 0.16.0 está atualizando idade das medições | APK assinado com a chave estável; instalação/atualização e descoberta ainda pedem validação em rede física. |
| [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.1.0) | 1.1.0 estável | Conta, sessões, autorização e presença; 1.2.0 em desenvolvimento para mostrar métricas recentes Mobile/TV sem confundir presença com stream | Instalador/ZIP mantêm dados em `%APPDATA%`; exportação criptografada permite recuperação. |
| [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) | Sem release publicada | Código 0.4.0 compila, descobre Desktop, consulta biblioteca e toca stream direto; versão 0.5.0 adiciona presença e telemetria | Só há APK debug de desenvolvimento. Não há assinatura estável nem pacote de distribuição. |

## Regras para atualizar sem perder configuração

- **Desktop e Server:** atualizar por cima com os pacotes oficiais; não apagar as pastas de dados do usuário. No Server, exportar periodicamente `Cobre-Server-backup` e guardar a senha separadamente.
- **Mobile:** releases futuras assinadas com a mesma chave podem atualizar por cima. Antes da primeira migração do APK debug para a versão assinada, fazer backup dos dados; a troca de assinatura pode exigir desinstalação e não é transparente. **TV:** ainda não possui canal assinado. Remover qualquer um dos apps apaga seus dados privados.
- Tokens protegidos pelo Android Keystore não devem ser copiados em backups portáteis. Depois de reinstalar ou trocar de aparelho, pode ser necessário autenticar novamente no Cobre ID e conceder acesso à pasta de música.

## Verificações práticas pendentes

1. Validar o fluxo completo da TV 0.5.0 em Android TV/Google TV físico: descoberta, pareamento, heartbeat, catálogo, capas, áudio, seek e métricas.
2. Confirmar descoberta e reprodução do Desktop no Mobile 0.15.0 em diferentes redes locais e após interrupção/reconexão.
3. Validar a restauração criptografada do Server pela interface Windows com uma instância descartável.
4. Configurar e validar certificado TLS confiável se o uso sair de uma rede privada confiável.
5. Confirmar atualização assinada do Mobile por cima da versão instalada e preservação dos dados.

Essas verificações acompanham compatibilidade e uso real; não alteram o papel do Cobre Server como serviço de identidade, presença e autorização, nem tornam o Server um relay de mídia.
