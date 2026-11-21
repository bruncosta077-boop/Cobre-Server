# Roadmap do Cobre Server

## Estado atual

- **Server 1.1.0 estável; 1.2.0 em validação:** identidade Cobre ID, sessões, presença, pareamento, pedidos e revogação por Desktop; 1.2.0 filtra telemetria recente Mobile/TV no diagnóstico.
- **Desktop 3.13.0:** anuncia presença local por mDNS quando o acesso remoto e o Cobre ID estão ativos. O anúncio não contém credenciais; os clientes ainda precisam de concessão e aprovação.
- **Mobile 0.15.0 pré-release assinada; 0.16.0 em validação:** login, QR e descoberta local; a nova versão envia a idade da amostra de stream para o Server.
- **TV 0.5.0 em validação:** biblioteca, reprodução direta do Desktop, descoberta local, autorização Cobre ID, presença periódica e medição agregada do stream. APK ainda é somente debug.
- A nova versão do painel prevista para 1.2.0 estende o diagnóstico de áudio do Mobile para TV e mostra somente amostras recentes de aparelhos online.

## Prioridades

1. **Validar em aparelhos reais:** conferir descoberta mDNS, aprovação/revogação, heartbeat, catálogo, capas e reprodução/seek em celular e Google TV. Registrar dispositivo, versão, rede e resultado sem expor dados pessoais.
2. **Confirmar telemetria sem falsos estados:** verificar que Mobile/TV aparecem online somente com heartbeat recente e que velocidade/latência expiram sem reprodução recente.
3. **Validar recuperação e dados:** testar exportação/restauração criptografada do Server em instância descartável e confirmar update do Desktop, Mobile e Server por cima preservando preferências.
4. **Reduzir dependência de HTTP local:** documentar TLS com certificado confiável para os endereços usados pelos aparelhos; testar login e renovação com validação padrão dos certificados.
5. **Aprimorar o ecossistema por contrato:** manter versões de protocolo compatíveis e definir uma especificação compartilhada antes de acrescentar rotas ou formatos novos.

## Itens futuros registrados

- Perfil Cobre ID: mostrar qual conta está conectada e permitir editar somente os campos que a API vier a suportar.
- Acesso fora de casa: documentar VPN (por exemplo Tailscale/WireGuard) antes de considerar relay próprio. O Server não deve receber nem retransmitir música.
- Assinatura digital do executável Windows.

## Princípios e critérios de pronto

- O Cobre Desktop continua sendo a origem dos arquivos. O Cobre Server coordena conta, consentimento e presença.
- Nenhum áudio passa pelo Server; presença Cobre ID não significa que o Desktop está acessível ou que a música toca.
- A descoberta local não autoriza acesso. Consentimentos continuam vinculados a aparelho/host, com escopos, expiração e revogação.
- Diagnósticos identificam a origem, a idade e a unidade; dados antigos não aparecem como velocidade atual.
- Quando Server ou internet ficam indisponíveis, não declarar falha do stream local sem testar a rota Desktop → aparelho.
- Compilação automatizada comprova build, não substitui validação com aparelhos e rede reais.
