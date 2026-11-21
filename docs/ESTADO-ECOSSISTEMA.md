# Estado do ecossistema Cobre

Atualizado em 2026-11-21. Este quadro separa a última versão publicada do código que existe no repositório. Uma compilação verde não comprova funcionamento em aparelho real.

| Aplicativo | Último lançamento publicado | Estado do código | Atualização e preservação de dados |
| --- | --- | --- | --- |
| [Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.8.0) | 3.8.0 estável | Streaming local com validação de faixas HTTP; precisa validação física com Mobile | Atualizador interno instala pacote e conserva dados em `userData`; há exportação/restauração de preferências sem senha/token e backup/rollback do atualizador. |
| [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases) | 0.12.0 pré-release (0.12.1 em publicação) | O ajuste estende a espera pelo token pelo prazo informado pelo Server e explica onde aprovar no Desktop; APK assinado em publicação | Releases assinadas com a mesma chave atualizam por cima e mantêm dados. A migração inicial do APK debug pode exigir backup e reinstalação. |
| [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v0.5.0-beta.12) | 0.5.0-beta.12 pré-release | Mostra pedidos pendentes, aponta para aprovação no Desktop e mantém pedidos por cinco minutos; o token só sai após consentimento do usuário | Instalador/ZIP mantêm dados em `%APPDATA%`; exportação criptografada permite recuperação. |
| [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) | Sem release publicada | Código 0.2.0 compila e contém configuração do Server e pareamento Cobre ID; biblioteca é demonstrativa e não toca áudio | Build atual é APK debug. Atualizar uma instalação Android exige o mesmo certificado; não há assinatura estável nem pacote de distribuição. |

## Regras para atualizar sem perder configuração

- **Desktop e Server:** atualizar por cima com os pacotes oficiais; não apagar as pastas de dados do usuário. No Server, exportar periodicamente `Cobre-Server-backup` e guardar a senha separadamente.
- **Mobile:** releases futuras assinadas com a mesma chave podem atualizar por cima. Antes da primeira migração do APK debug para a versão assinada, fazer backup dos dados; a troca de assinatura pode exigir desinstalação e não é transparente. **TV:** ainda não possui canal assinado. Remover qualquer um dos apps apaga seus dados privados.
- Tokens protegidos pelo Android Keystore não devem ser copiados em backups portáteis. Depois de reinstalar ou trocar de aparelho, pode ser necessário autenticar novamente no Cobre ID e conceder acesso à pasta de música.

## Critérios pendentes para Cobre Server 1.0.0

1. Definir e validar transporte TLS que seja confiável no Desktop, Mobile e TV.
2. Validar backup/restauração pela interface Windows usando uma instância descartável com dados reais de teste.
3. Testar autorização de aparelho e streaming Desktop→Mobile em aparelhos físicos; presença online não é prova de reprodução.
4. Implementar biblioteca e playback reais na TV e validar em Android TV/Google TV.
5. Validar a primeira migração do Mobile do APK debug para a assinatura estável e comprovar a preservação de dados nas atualizações seguintes.

Até esses itens terem evidência de execução, o Server permanece beta e não deve ser chamado de 1.0 estável.
