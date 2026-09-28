-- Caderninho — tamanho do cocô e alerta marrom (28/09/2026).
-- Rodar uma vez no SQL Editor, depois do 008 e ANTES de publicar o app novo. Sem ele, o app novo
-- salva a fralda normalmente, mas não salva quando se escolhe o tamanho ou o alerta marrom.
--
-- Só acrescenta; nenhum registro existente muda, e todos já cumprem as regras novas.
--   - entries.poo_size: o tamanho do cocô, opcional — 'pequeno', 'medio', 'grande' ou 'gigante'.
--   - entries.poo_alert: o alerta marrom (vazou da fralda). Só true ou vazio.
--   Os dois só na fralda com cocô.

begin;

alter table public.entries
  add column poo_size  text check (poo_size in ('pequeno','medio','grande','gigante')),
  add column poo_alert boolean check (poo_alert);

alter table public.entries
  add constraint entries_poo_detail check ((poo_size is null and poo_alert is null) or (kind = 'diaper' and poo is true));

grant insert (poo_size, poo_alert) on public.entries to authenticated;
grant update (poo_size, poo_alert) on public.entries to authenticated;

commit;
