# Estado do ecossistema Cobre

Atualizado em 2026-11-21. Versões publicadas e estado de integração são registrados separadamente; uma compilação verde não comprova alcance de rede em todos os aparelhos.

| Aplicativo | Último lançamento publicado | Estado do código | Atualização e preservação de dados |
| --- | --- | --- | --- |
| [Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.12.2) | 3.12.2 estável | Versão mostrada na interface vem do executável; streaming local protegido por concessões | Atualizador interno conserva os dados e valida SHA-256; backup/rollback do pacote. |
| [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.13.1) | 0.13.1 pré-release (APK assinado) | QR solicita autorização no Desktop; falhas de rede indicam passos de diagnóstico em vez de expor erro bruto do Android | Releases assinadas com a mesma chave atualizam por cima e mantêm dados. A migração inicial do APK debug pode exigir backup e reinstalação. |
| [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.0.0) | 1.0.0 estável | Cobre ID, sessões, presença e autorização por Desktop; mantém API ativa na bandeja e pode iniciar com o Windows | Instalador/ZIP mantêm dados em `%APPDATA%`; exportação criptografada permite recuperação. |
| [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) | Sem release publicada | Código 0.2.0 compila e contém configuração do Server e pareamento Cobre ID; biblioteca é demonstrativa e não toca áudio | Build atual é APK debug. Atualizar uma instalação Android exige o mesmo certificado; não há assinatura estável nem pacote de distribuição. |

## Regras para atualizar sem perder configuração

- **Desktop e Server:** atualizar por cima com os pacotes oficiais; não apagar as pastas de dados do usuário. No Server, exportar periodicamente `Cobre-Server-backup` e guardar a senha separadamente.
- **Mobile:** releases futuras assinadas com a mesma chave podem atualizar por cima. Antes da primeira migração do APK debug para a versão assinada, fazer backup dos dados; a troca de assinatura pode exigir desinstalação e não é transparente. **TV:** ainda não possui canal assinado. Remover qualquer um dos apps apaga seus dados privados.
- Tokens protegidos pelo Android Keystore não devem ser copiados em backups portáteis. Depois de reinstalar ou trocar de aparelho, pode ser necessário autenticar novamente no Cobre ID e conceder acesso à pasta de música.

## Verificações que continuam após a versão estável

1. Repetir o teste físico Mobile→Cobre ID depois de instalar o Server 1.0.0; no último diagnóstico, o celular atingiu o timeout da porta 8080 e o Server não estava disponível naquele momento.
2. Validar a restauração criptografada pela interface Windows com uma instância descartável.
3. Configurar e validar um certificado TLS confiável se o uso sair de uma rede privada confiável.
4. Implementar biblioteca e reprodução reais na TV e validar em Android TV/Google TV.
5. Confirmar atualizações assinadas do Mobile por cima da versão já instalada e a preservação dos dados.

Essas verificações são acompanhamentos de compatibilidade e uso real; não mudam o escopo estável do Cobre Server 1.0.0 como serviço local de identidade e autorização.
