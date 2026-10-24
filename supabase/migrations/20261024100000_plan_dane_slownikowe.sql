-- Spec 13, migration 1: input data of the timetable generator, part 1 (time, rooms, students, instructors).
--
-- Mirrors requirements/dane_planu.json. Ids are the source ids (`A281`, `INF1-R1-G1`, `P01`), so they are text keys.
-- Names that would clash with the older, simpler model (`grupy`, `prowadzacy`, `przedmioty`, `zajecia`) get a `_plan` suffix.

create type public.typ_dnia as enum ('zajecia', 'wolne', 'odpracowanie');

-- 12 slots of 45 minutes with 15-minute breaks.
create table public.sloty (
  slot smallint primary key,
  od time not null,
  "do" time not null,
  constraint sloty_slot_check check (slot between 1 and 12),
  constraint sloty_godziny_check check (od < "do")
);

-- One row per calendar day of the semester. `plan_dnia` is the weekday whose timetable runs that day (1 = Monday),
-- `nr_tygodnia` is the occurrence number (1-14) of that plan day. Days off have neither.
create table public.kalendarz (
  data date primary key,
  dzien_tygodnia text not null,
  typ_dnia public.typ_dnia not null,
  plan_dnia smallint,
  nr_tygodnia smallint,
  opis text not null default '',
  constraint kalendarz_plan_dnia_check check (plan_dnia between 1 and 5),
  constraint kalendarz_nr_tygodnia_check check (nr_tygodnia between 1 and 14),
  constraint kalendarz_dzien_planu_check check (
    (typ_dnia = 'wolne') = (plan_dnia is null and nr_tygodnia is null)
  )
);

-- A plan day occurs once per week number.
create unique index kalendarz_plan_dnia_nr_tygodnia_key on public.kalendarz (plan_dnia, nr_tygodnia)
  where plan_dnia is not null;

create table public.sale (
  id text primary key,
  nazwa text,
  budynek text not null,
  typ text not null,
  -- unknown for some rooms that are not available for planning (specialist labs)
  pojemnosc integer,
  pojemnosc_szacowana boolean not null default false,
  metraz_m2 numeric(7, 1),
  wyposazenie text[] not null default '{}',
  przeznaczenie text,
  dostepna_do_planowania boolean not null default true,
  uwagi text,
  constraint sale_typ_check check (
    typ in ('aula', 'sala_dydaktyczna', 'pracownia_komputerowa', 'pracownia_robotyki', 'pracownia_specjalistyczna')
  ),
  constraint sale_pojemnosc_check check (pojemnosc > 0),
  constraint sale_pojemnosc_znana_check check (pojemnosc is not null or not dostepna_do_planowania)
);

create table public.roczniki (
  id text primary key,
  kierunek text not null,
  stopien_studiow text not null,
  rok smallint not null,
  semestr smallint not null,
  nazwa text not null,
  liczba_studentow integer not null,
  syntetyczny boolean not null default false,
  constraint roczniki_stopien_check check (stopien_studiow in ('I', 'II')),
  constraint roczniki_liczba_studentow_check check (liczba_studentow >= 0)
);

create table public.grupy_plan (
  id text primary key,
  rocznik_id text not null references public.roczniki (id) on delete cascade,
  nazwa text not null,
  typ text not null,
  podzial text,
  grupa_nadrzedna text references public.grupy_plan (id) on delete restrict,
  liczba_studentow integer not null,
  constraint grupy_plan_typ_check check (typ in ('rocznik', 'grupa', 'opcja', 'specjalnosc', 'seminarium')),
  constraint grupy_plan_liczba_studentow_check check (liczba_studentow >= 0)
);

create index grupy_plan_rocznik_id_idx on public.grupy_plan (rocznik_id);
create index grupy_plan_grupa_nadrzedna_idx on public.grupy_plan (grupa_nadrzedna);

create table public.studenci (
  id text primary key,
  rocznik_id text not null references public.roczniki (id) on delete cascade
);

create index studenci_rocznik_id_idx on public.studenci (rocznik_id);

-- The source of truth for clashes: two groups clash when they share a student.
create table public.studenci_grupy (
  student_id text not null references public.studenci (id) on delete cascade,
  grupa_id text not null references public.grupy_plan (id) on delete cascade,
  primary key (student_id, grupa_id)
);

create index studenci_grupy_grupa_id_idx on public.studenci_grupy (grupa_id);

-- Pairs of clashing groups, precomputed from `studenci_grupy` (kept as delivered in the source data).
create table public.kolizje_grup (
  grupa_a text not null references public.grupy_plan (id) on delete cascade,
  grupa_b text not null references public.grupy_plan (id) on delete cascade,
  wspolni_studenci integer not null,
  primary key (grupa_a, grupa_b),
  constraint kolizje_grup_rozne_check check (grupa_a <> grupa_b),
  constraint kolizje_grup_wspolni_check check (wspolni_studenci > 0)
);

create index kolizje_grup_grupa_b_idx on public.kolizje_grup (grupa_b);

create table public.prowadzacy_plan (
  id text primary key,
  stopien text,
  nazwa text not null,
  jednostka text,
  czlonek_rady_wydzialu boolean not null default false
);

create table public.przedmioty_plan (
  id text primary key,
  rocznik_id text not null references public.roczniki (id) on delete cascade,
  nazwa text not null
);

create index przedmioty_plan_rocznik_id_idx on public.przedmioty_plan (rocznik_id);
