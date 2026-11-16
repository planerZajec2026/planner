-- Spec 13: drops the first model of the app (spec 08), which only ever held the design mock-up.
--
-- The app now reads the generator's tables (`*_plan`, `sale`, `grupy_plan`…, loaded by `wgraj_dane_planu`). The old
-- tables, their enums and the part-time study mode (`tryb_studiow`, "niestacjonarne") are no longer used anywhere.
-- `ustawienia` stays: the sidebar footer will read the academic year from it.
--
-- Destructive, and it runs in the cloud project through the deploy-db workflow: the old tables only ever held the
-- seed from the mock-up (spec 09 seeds the cloud only on request), so nothing of value is lost.

drop table public.odwolane_zajecia;
drop table public.dni_wolne;
drop table public.zajecia;
drop table public.prowadzacy_przedmioty;
drop table public.prowadzacy;
drop table public.przedmioty;
drop table public.grupy;
drop table public.kierunki;

drop type public.powtarzalnosc;
drop type public.typ_zajec;
drop type public.tryb_studiow;
drop type public.tytul_naukowy;
