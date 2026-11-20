# Estado do ecossistema Cobre

Atualizado em 2026-11-20. Este quadro separa a última versão publicada do código que existe no repositório. Uma compilação verde não comprova funcionamento em aparelho real.

| Aplicativo | Último lançamento publicado | Estado do código | Atualização e preservação de dados |
| --- | --- | --- | --- |
| [Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.8.0) | 3.8.0 estável | Streaming local com validação de faixas HTTP; precisa validação física com Mobile | Atualizador interno instala pacote e conserva dados em `userData`; há exportação/restauração de preferências sem senha/token e backup/rollback do atualizador. |
| [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases) | 0.9.0 pré-release | `main` contém código 0.11.0, autorização de TV e backup seletivo de configurações; build debug passou em `44746930132`, APK de release estável ainda não publicado | Atualização Android sobre a instalação mantém os dados somente com o mesmo `applicationId` e certificado. A chave de distribuição ainda não está configurada nos segredos do GitHub. APK debug não deve ser tratado como canal de atualização estável. |
| [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.3) | 0.5.0-beta.3 pré-release | Contas Cobre ID, dispositivos, presença, painel e backup criptografado da instância | Instalador/ZIP mantêm a base em `%APPDATA%`; exportação criptografada permite recuperação. A API LAN continua HTTP e o produto não retransmite áudio. |
| [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) | Sem release publicada | Código 0.2.0 compila e contém configuração do Server e pareamento Cobre ID; biblioteca é demonstrativa e não toca áudio | Build atual é APK debug. Atualizar uma instalação Android exige o mesmo certificado; não há assinatura estável nem pacote de distribuição. |

## Regras para atualizar sem perder configuração

- **Desktop e Server:** atualizar por cima com os pacotes oficiais; não apagar as pastas de dados do usuário. No Server, exportar periodicamente `Cobre-Server-backup` e guardar a senha separadamente.
- **Mobile e TV:** instalar o APK como atualização, sem desinstalar, quando a assinatura for a mesma. Hoje o Mobile ainda precisa de uma chave estável de distribuição; TV ainda não possui canal assinado. Remover o app apaga seus dados privados.
- A mudança inicial do Mobile de APK de depuração para uma chave estável precisa de um plano de migração antes de publicar o primeiro APK assinado. A troca de assinatura não pode ser apresentada como atualização transparente.
- Tokens protegidos pelo Android Keystore não devem ser copiados em backups portáteis. Depois de reinstalar ou trocar de aparelho, pode ser necessário autenticar novamente no Cobre ID e conceder acesso à pasta de música.

## Critérios pendentes para Cobre Server 1.0.0

1. Definir e validar transporte TLS que seja confiável no Desktop, Mobile e TV.
2. Validar backup/restauração pela interface Windows usando uma instância descartável com dados reais de teste.
3. Testar autorização de aparelho e streaming Desktop→Mobile em aparelhos físicos; presença online não é prova de reprodução.
4. Implementar biblioteca e playback reais na TV e validar em Android TV/Google TV.
5. Preparar uma assinatura Mobile estável e validar a migração de dados antes de publicar um APK assinável.

Até esses itens terem evidência de execução, o Server permanece beta e não deve ser chamado de 1.0 estável.
