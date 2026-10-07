-- Soneca — apagar a conta pelo app (07/10/2026). Exigência da Apple e da LGPD.
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo: sem a função, o botão "Apagar minha conta"
-- avisa que não conseguiu e nada é apagado.
--
-- O que acontece com quem apaga a conta:
--   - família que a pessoa criou e em que outros também estão: passa para o membro mais antigo
--     depois dela (o primeiro que entrou), com os bebês e os registros. Muda a regra de 24/09, em que
--     a família era apagada junto com o criador;
--   - família que só tem a pessoa: é apagada, com os bebês e os registros (ligação do 001);
--   - família em que entrou por convite: ela sai; o que anotou fica, sem o autor (ligações do 001);
--   - sugestões que mandou: apagadas (antes ficariam sem autor);
--   - o login (auth.users) e o perfil: apagados.

begin;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  -- Passa a família para o membro mais antigo depois de quem sai (empate: o menor id, como no app).
  update public.families f
     set creator_id = (select m.user_id from public.family_members m
                       where m.family_id = f.id and m.user_id <> uid
                       order by m.joined_at, m.user_id limit 1)
   where f.creator_id = uid
     and exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id <> uid);

  delete from public.feedback where user_id = uid;

  -- Apaga o login; as ligações do banco cuidam do resto (perfil, famílias só dela, autoria).
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select proname, prosecdef from pg_proc where proname = 'delete_my_account';
