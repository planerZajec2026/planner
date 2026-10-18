-- Spec 08, migration 4: days off, cancelled occurrences and app settings. Read by the week view in spec 10.

create table public.dni_wolne (
  data date primary key,
  opis text not null,
  constraint dni_wolne_opis_check check (btrim(opis) <> '')
);

-- A single cancelled occurrence of a recurring class.
create table public.odwolane_zajecia (
  zajecia_id bigint not null references public.zajecia (id) on delete cascade,
  data date not null,
  powod text,
  primary key (zajecia_id, data)
);

-- Exactly one row: the `id` column can only be true.
create table public.ustawienia (
  id boolean primary key default true,
  rok_akademicki text not null,
  semestr text not null,
  constraint ustawienia_jeden_wiersz check (id),
  constraint ustawienia_rok_akademicki_check check (rok_akademicki ~ '^\d{4}/\d{4}$'),
  constraint ustawienia_semestr_check check (semestr in ('zimowy', 'letni'))
);
