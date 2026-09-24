-- Caderninho — esquema inicial.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.
-- Termos seguem o CONTEXT.md: família, criador, membro, convite, bebê, registro, autor.

-- ============ Tabelas ============

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at   timestamptz not null default now()
);

create table public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  -- Se o criador apagar a conta, a família é apagada junto (regra decidida em 24/09/2026).
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members(user_id);

create table public.babies (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  birth_date date,
  created_at timestamptz not null default now(),
  unique (id, family_id)
);
create index babies_family_idx on public.babies(family_id);

create table public.entries (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null,
  baby_id    uuid not null,
  kind       text not null check (kind in ('feed','sleep','wake','diaper','vomit','other')),
  at         timestamptz not null,
  src        text check (src in ('breast','bottle')),
  ml         integer check (ml between 1 and 1000),
  pee        boolean,
  poo        boolean,
  note       text check (char_length(note) <= 300),
  -- Autor continua no registro mesmo se sair da família; vira nulo só se apagar a conta.
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Garante que o bebê pertence à mesma família do registro.
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade,
  check (kind <> 'other'  or char_length(btrim(coalesce(note, ''))) > 0),
  check (kind <> 'diaper' or coalesce(pee, false) or coalesce(poo, false))
);
create index entries_baby_at_idx on public.entries(baby_id, at desc);
create index entries_family_idx  on public.entries(family_id);

create table public.invites (
  -- 64 caracteres aleatórios: impossível de adivinhar.
  token      text primary key default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  family_id  uuid not null references public.families(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by    uuid references public.profiles(id) on delete set null,
  used_at    timestamptz
);
create index invites_family_idx on public.invites(family_id);

-- ============ Funções de apoio às regras ============
-- "security definer" deixa a função consultar family_members sem esbarrar nas próprias regras.

create function public.is_member(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fam and user_id = auth.uid());
$$;

create function public.is_creator(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.families where id = fam and creator_id = auth.uid());
$$;

-- Vejo o nome de quem divide família comigo, ou de quem é autor de registros nas minhas famílias.
create function public.can_see_profile(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid = auth.uid()
      or exists (select 1 from public.family_members a
                 join public.family_members b on b.family_id = a.family_id
                 where a.user_id = auth.uid() and b.user_id = pid)
      or exists (select 1 from public.entries e
                 join public.family_members m on m.family_id = e.family_id
                 where e.author_id = pid and m.user_id = auth.uid());
$$;

-- ============ Travas automáticas ============

-- Registro: o autor é sempre quem está logado; ao editar, autor, família e data de criação não mudam.
create function public.entries_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id  := auth.uid();
    new.created_at := now();
  else
    new.author_id  := old.author_id;
    new.family_id  := old.family_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger entries_guard before insert or update on public.entries
  for each row execute function public.entries_guard();

-- Bebê não muda de família.
create function public.babies_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.family_id := old.family_id;
  return new;
end $$;
create trigger babies_guard before update on public.babies
  for each row execute function public.babies_guard();

-- ============ Regras de acesso (RLS) ============

alter table public.profiles       enable row level security;
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.babies         enable row level security;
alter table public.entries        enable row level security;
alter table public.invites        enable row level security;

create policy "ver nomes de quem divide família" on public.profiles
  for select to authenticated using (public.can_see_profile(id));
create policy "criar o próprio nome" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "mudar o próprio nome" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Família nasce pela função create_family (sem regra de insert direta).
create policy "membros veem a família" on public.families
  for select to authenticated using (public.is_member(id));
create policy "criador renomeia" on public.families
  for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "criador apaga" on public.families
  for delete to authenticated using (creator_id = auth.uid());

-- Entrada na família só pela função accept_invite.
create policy "membros veem os membros" on public.family_members
  for select to authenticated using (public.is_member(family_id));
create policy "criador remove outros; membro sai sozinho" on public.family_members
  for delete to authenticated using (
    (public.is_creator(family_id) and user_id <> auth.uid())
    or (user_id = auth.uid() and not public.is_creator(family_id))
  );

create policy "membros veem bebês" on public.babies
  for select to authenticated using (public.is_member(family_id));
create policy "membros cadastram bebês" on public.babies
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam bebês" on public.babies
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "criador apaga bebê" on public.babies
  for delete to authenticated using (public.is_creator(family_id));

create policy "membros veem registros" on public.entries
  for select to authenticated using (public.is_member(family_id));
create policy "membros registram" on public.entries
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam registros" on public.entries
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "membros apagam registros" on public.entries
  for delete to authenticated using (public.is_member(family_id));

create policy "criador vê convites" on public.invites
  for select to authenticated using (public.is_creator(family_id));
create policy "criador cria convites" on public.invites
  for insert to authenticated with check (public.is_creator(family_id));
create policy "criador cancela convites" on public.invites
  for delete to authenticated using (public.is_creator(family_id));

-- ============ Ações que precisam de mais de um passo ============

-- Cria a família, põe quem criou como membro e, se vier, cadastra o primeiro bebê.
create function public.create_family(family_name text, baby_name text default null, baby_birth date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'no_profile'; end if;
  insert into public.families (name, creator_id) values (btrim(family_name), auth.uid()) returning id into fid;
  insert into public.family_members (family_id, user_id) values (fid, auth.uid());
  if baby_name is not null and btrim(baby_name) <> '' then
    insert into public.babies (family_id, name, birth_date) values (fid, btrim(baby_name), baby_birth);
  end if;
  return fid;
end $$;

-- Mostra para quem abriu o link de qual família é o convite, antes de aceitar.
create function public.invite_info(tok text)
returns table (family_name text, creator_name text, is_valid boolean)
language sql stable security definer set search_path = '' as $$
  select f.name, p.display_name, (i.used_at is null and i.expires_at > now())
  from public.invites i
  join public.families f on f.id = i.family_id
  join public.profiles p on p.id = f.creator_id
  where i.token = tok;
$$;

-- Aceita o convite: vale uma vez, por 7 dias. Quem já é membro não gasta o convite.
create function public.accept_invite(tok text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.invites;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'no_profile'; end if;
  select * into inv from public.invites where token = tok for update;
  if not found then raise exception 'invite_not_found'; end if;
  if exists (select 1 from public.family_members where family_id = inv.family_id and user_id = auth.uid()) then
    return inv.family_id;
  end if;
  if inv.used_at is not null then raise exception 'invite_used'; end if;
  if inv.expires_at <= now() then raise exception 'invite_expired'; end if;
  insert into public.family_members (family_id, user_id) values (inv.family_id, auth.uid());
  update public.invites set used_by = auth.uid(), used_at = now() where token = tok;
  return inv.family_id;
end $$;

-- ============ Permissões ============
-- Ninguém deslogado acessa nada. Logados passam pelas regras de acesso acima.

revoke all on public.profiles, public.families, public.family_members,
              public.babies, public.entries, public.invites from anon;
grant select, insert, update, delete on public.profiles, public.families, public.family_members,
              public.babies, public.entries, public.invites to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_member(uuid), public.is_creator(uuid), public.can_see_profile(uuid),
                          public.create_family(text, text, date), public.invite_info(text),
                          public.accept_invite(text) to authenticated;

-- Registros novos aparecem na hora no celular dos outros membros.
alter publication supabase_realtime add table public.entries;
