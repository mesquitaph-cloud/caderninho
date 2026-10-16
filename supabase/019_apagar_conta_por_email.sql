-- Soneca — apagar a conta de quem pediu por e-mail (15/10/2026). Não é mudança no banco: é um roteiro para
-- usar no SQL Editor a cada pedido que chegar pela página soneca.app.br/apagar-conta.
--
-- Faz exatamente o que o botão "Apagar minha conta" do app faz (função delete_my_account, do 012 e do 014):
-- a família que a pessoa criou passa para o membro mais antigo; família só dela é apagada inteira; nas
-- outras, o que ela anotou fica sem o nome; as sugestões dela são apagadas; o login e o perfil somem.
--
-- Antes de rodar:
--   1. Confira que o e-mail do pedido veio do mesmo endereço da conta (Política, seção 12). Se a pessoa
--      não lembra o e-mail, responda pedindo o nome que aparecia na família e o nome do bebê, e só
--      então procure a conta.
--   2. Guarde o e-mail do pedido e a sua resposta: são a prova do pedido de exclusão (até 5 anos).
--
-- Como usar: troque EMAIL_DA_CONTA abaixo (uma vez só) e rode o arquivo inteiro. Se não existir conta com
-- esse e-mail, nada é apagado e aparece "nenhuma conta com esse e-mail".
--
-- Conta que entrou com a Apple: o app cancela o acesso da Apple ao apagar; por aqui, não. Na resposta,
-- diga à pessoa que pode tirar o Soneca em Ajustes → (nome dela) → Entrar com a Apple.

begin;

-- O banco passa a agir como se a própria pessoa estivesse no app (só dentro desta transação).
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where lower(email) = lower('EMAIL_DA_CONTA')),
                    'role', 'authenticated')::text,
  true);

do $$ begin
  if auth.uid() is null then raise exception 'nenhuma conta com esse e-mail'; end if;
end $$;

select public.delete_my_account();

commit;

-- Conferir depois (só conta, não mostra dados de ninguém; deve dar 0):
--   select count(*) from auth.users where lower(email) = lower('EMAIL_DA_CONTA');
