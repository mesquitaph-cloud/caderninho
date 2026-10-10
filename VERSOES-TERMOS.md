# Versões da Política de Privacidade e dos Termos de Uso

A Política e os Termos andam juntos: uma versão vale para os dois, e é o `TERMS_VERSION` do `app.js`
(com a data em `TERMS_SINCE`). O aceite de cada pessoa fica em `consents`, com a versão.

| Versão | Em vigor | Revisão do advogado | Aceite de novo? |
|---|---|---|---|
| 1.1 | desde 10/10/2026 | pendente | Sim, pela tela "mudaram" |
| 1.0 | 06/10/2026 a 09/10/2026 | 07/10/2026, sem mudanças | Primeira versão |

## 1.1 (10/10/2026): grátis agora, assinatura depois

Arquivos: `termos/index.html` e `privacidade/index.html`. Só amplia direitos, por isso vale já, sem os
30 dias de aviso (Termos, seção 9).

- **Pagamento no futuro.** O Soneca é grátis hoje, sem assinatura nem cartão. A assinatura pelas lojas vem
  depois (Termos, seção 6, agora "Grátis agora, assinatura depois").
- **Aviso de 30 dias** no app e por e-mail antes de começar a cobrar, com o preço e as regras.
- **Famílias pioneiras grátis para sempre:** a família criada antes do início da cobrança continua grátis,
  sem prazo, com todos os membros, inclusive quem entrar depois por convite.
- **Preço fora do texto:** os R$ 9,90 saíram e passam a aparecer só no aviso e na loja.
- **Regras da assinatura só para famílias novas:** teste de 7 dias, renovação, cancelamento, arrependimento,
  mudança de preço e o modo só leitura depois dos 7 dias, como na 1.0.
- **Política:** a seção 6 diz que hoje é grátis e remete aos Termos; na seção 10, apagar 6 meses depois do
  fim da assinatura vale só para quem tiver assinatura.
- **Termos, seção 8:** "Se houver assinatura, apagar a conta não a cancela na loja".

## 1.0 (06/10/2026): primeira versão

Arquivos: `termos/1.0.html` e `privacidade/1.0.html` (texto guardado sem mudanças).

- Controlador e encarregado: Patrick, pessoa física.
- Dados do bebê e de saúde com consentimento específico, em destaque.
- Apagar a conta, a família passar para o membro mais antigo e sair da família sem deixar o nome.
- Guarda: registros de acesso por 6 meses, dados da assinatura por 5 anos, provas de aceite por até 5 anos.
- Assinatura de R$ 9,90 por mês para a família toda, com 7 dias grátis e modo só leitura depois.
- Sem cópias de segurança (Supabase Free).

## Para fazer uma versão nova

1. Copiar `termos/index.html` e `privacidade/index.html` para `<pasta>/<versão atual>.html`. Na cópia,
   trocar a linha da versão por "em vigor de X a Y. Substituída pela versão atual" e pôr no rodapé o link
   para a atual.
2. Mudar o texto, a versão e a data no topo de cada página e no `<meta name="description">`. Listar a
   versão antiga no rodapé.
3. Subir `TERMS_VERSION` e `TERMS_SINCE` no `app.js`.
4. Acrescentar a versão nesta tabela e uma seção com o que ela tem de específico.
5. Se a mudança tirar direitos, avisar 30 dias antes (Termos, seção 9) e pedir o aceite. Se só
   acrescentar direitos, pode valer já.
6. Mandar ao advogado e anotar a data da revisão aqui.
