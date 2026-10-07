-- Soneca — dados de exemplo da conta de demonstração para a revisão da Apple (07/10/2026).
-- Não muda o esquema. Rodar no SQL Editor logo ANTES de mandar o app para a revisão, e de novo se o
-- revisor apagar a conta (depois de criar a conta outra vez).
--
-- Antes de rodar: criar a conta em Authentication › Users › Add user › Create new user, com o e-mail
-- da revisão, uma senha forte e "Auto Confirm User" marcado. O e-mail não aparece aqui: o arquivo acha
-- a conta pelo SHA-256 do endereço, o mesmo de DEMO_EMAIL_SHA256 em config.js.
--
-- O que faz: apaga as famílias que a conta criou e monta do zero a "Família Revisão", com o bebê Theo
-- (4 meses) e 3 semanas de mamadas, sono, fraldas e a vitamina D das 9:00, mais duas medidas e um marco.
-- As datas contam a partir de hoje (horário de Brasília) e nada fica no futuro, então "hoje" e "ontem"
-- aparecem preenchidos. Os registros saem com a própria conta como autora.

do $$
declare
  uid  uuid;
  fid  uuid;
  bid  uuid;
  mid  uuid;
  tz   text := 'America/Sao_Paulo';
  day0 date := (now() at time zone 'America/Sao_Paulo')::date;
  d    int;
  j    interval;
  base timestamptz;
  t    timestamptz;
  x    text;
begin
  select id into uid from auth.users
   where encode(sha256(convert_to(lower(email), 'UTF8')), 'hex') = '52403205c819de91ced2427a7796e28edd113937a55d110fc012011c2f9f5584';
  if uid is null then
    raise exception 'Conta da revisão não encontrada. Crie antes em Authentication › Users › Add user.';
  end if;

  -- As travas automáticas (autor, criado por) usam auth.uid(): aqui, a própria conta da revisão.
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);

  insert into public.profiles (id, display_name) values (uid, 'Ana') on conflict (id) do nothing;
  delete from public.families where creator_id = uid;

  insert into public.families (name, creator_id) values ('Família Revisão', uid) returning id into fid;
  insert into public.family_members (family_id, user_id) values (fid, uid);
  insert into public.babies (family_id, name, birth_date, sex) values (fid, 'Theo', day0 - 120, 'M') returning id into bid;

  insert into public.medicines (family_id, baby_id, name, amount, schedule, times, start_date)
  values (fid, bid, 'Vitamina D', '2 gotas', 'fixed', array['09:00'::time], day0 - 20) returning id into mid;

  for d in 0..20 loop
    base := (day0 - d)::timestamp at time zone tz;          -- meia-noite daquele dia
    j := make_interval(mins => (d * 7) % 15);               -- um dia não fica igual ao outro

    -- Sono: madrugada em dois blocos, três sonecas e o começo da noite.
    foreach x in array array['00:10 sleep','03:50 wake','04:20 sleep','06:40 wake','09:00 sleep','10:20 wake',
                             '12:30 sleep','14:10 wake','16:00 sleep','16:50 wake','19:30 sleep','23:40 wake'] loop
      t := base + split_part(x, ' ', 1)::time + j;
      if t <= now() then
        insert into public.entries (family_id, baby_id, kind, at) values (fid, bid, split_part(x, ' ', 2), t);
      end if;
    end loop;

    -- Mamadas: peito nos dois lados de dia, mamadeira à noite.
    foreach x in array array['04:00 b 9 6','07:00 b 12 8','10:30 b 10 10','14:20 b 8 11','17:10 b 11 7',
                             '19:10 m 120','23:45 m 150'] loop
      t := base + split_part(x, ' ', 1)::time + j;
      if t <= now() then
        if split_part(x, ' ', 2) = 'b' then
          insert into public.entries (family_id, baby_id, kind, at, src, side, left_min, right_min)
          values (fid, bid, 'feed', t, 'breast', 'both',
                  split_part(x, ' ', 3)::int + d % 3, split_part(x, ' ', 4)::int + (d + 1) % 3);
        else
          insert into public.entries (family_id, baby_id, kind, at, src, ml)
          values (fid, bid, 'feed', t, 'bottle', split_part(x, ' ', 3)::int - 10 * (d % 3));
        end if;
      end if;
    end loop;

    -- Fraldas: xixi ao longo do dia; cocô de manhã, em dia sim, dia não.
    foreach x in array array['04:10 p','07:10 p','10:40 c','14:30 p','17:20 p','19:20 p'] loop
      t := base + split_part(x, ' ', 1)::time + j;
      if t <= now() then
        if split_part(x, ' ', 2) = 'c' and d % 2 = 0 then
          insert into public.entries (family_id, baby_id, kind, at, pee, poo, poo_size)
          values (fid, bid, 'diaper', t, true, true, case when d % 4 = 0 then 'grande' else 'medio' end);
        else
          insert into public.entries (family_id, baby_id, kind, at, pee) values (fid, bid, 'diaper', t, true);
        end if;
      end if;
    end loop;

    -- Vitamina D das 9:00, dada uns minutos depois.
    t := base + time '09:05' + j;
    if t <= now() then
      insert into public.entries (family_id, baby_id, kind, at, medicine_id, med_name, med_amount, dose_at)
      values (fid, bid, 'med', t, mid, 'Vitamina D', '2 gotas', base + time '09:00');
    end if;
  end loop;

  insert into public.weights (family_id, baby_id, measured_on, grams, cm) values
    (fid, bid, day0 - 30, 6400, 62.0),
    (fid, bid, day0 - 2, 6950, 63.5);
  insert into public.milestones (family_id, baby_id, happened_on, title) values (fid, bid, day0 - 60, 'Sorriu');
end $$;

-- Conferir (só números):
--   select kind, count(*) from public.entries e join public.families f on f.id = e.family_id
--    where f.name = 'Família Revisão' group by kind order by kind;
