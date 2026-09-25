-- Caderninho — reforço de segurança (revisão de 24/09/2026).
-- Rodar uma vez no SQL Editor, depois do 001.
--
-- Antes, quem estava logado podia escrever em qualquer coluna que as regras de acesso deixassem.
-- Agora cada tabela só aceita as colunas que o app realmente usa. Exemplos do que isso impede:
-- o criador inventar um convite com validade de 100 anos ou um código fácil de adivinhar;
-- alguém gravar autor, data de criação ou família diretamente num registro.
--
-- Rodado no banco só em 25/09/2026, depois do 004. As listas abaixo já incluem as
-- colunas do 004 (side, left_min, right_min): o revoke da tabela toda também apaga as permissões
-- por coluna dadas antes, então sem elas o app deixaria de salvar mamada e ordenha.

revoke insert, update on public.profiles, public.families, public.family_members,
                         public.babies, public.entries, public.invites from authenticated;

grant insert (id, display_name)                                     on public.profiles to authenticated;
grant update (display_name)                                         on public.profiles to authenticated;
grant update (name)                                                 on public.families to authenticated;
grant insert (family_id, name, birth_date)                          on public.babies   to authenticated;
grant update (name, birth_date)                                     on public.babies   to authenticated;
grant insert (family_id, baby_id, kind, at, src, ml, side, left_min, right_min, pee, poo, note)
                                                                    on public.entries  to authenticated;
grant update (baby_id, kind, at, src, ml, side, left_min, right_min, pee, poo, note)
                                                                    on public.entries  to authenticated;
grant insert (family_id)                                            on public.invites  to authenticated;
