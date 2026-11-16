-- Spec 13: loading the generator's input data (`dane_planu`) in one transaction.
--
-- `wgraj_dane_planu(payload)` replaces all input data and the generated plans with the data in `payload`, a JSON object
-- shaped like requirements/dane_planu.json (one array per table). It is the only way data gets in: supabase/seed.sql
-- calls it with the data from src/lib/mock-data.ts, and the import page of the app calls it with an uploaded file.
-- Everything happens in the function's single transaction, so a rejected file changes nothing.
--
-- Only service_role may call it (the app's Server Action and the seed). It is security definer so it can truncate.

create function public.wgraj_dane_planu(payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Truncating the roots with cascade also empties everything that refers to them (groups, classes, plans…).
  truncate table
    public.roczniki, public.sale, public.prowadzacy_plan, public.sloty, public.kalendarz,
    public.rada_wydzialu, public.generation_jobs
  restart identity cascade;

  insert into public.sloty (slot, od, "do")
  select r.slot, r.od, r."do"
  from jsonb_to_recordset(payload -> 'sloty') as r (slot smallint, od time, "do" time);

  insert into public.kalendarz (data, dzien_tygodnia, typ_dnia, plan_dnia, nr_tygodnia, opis)
  select r.data, r.dzien_tygodnia,
         (case r.typ_dnia when 'zajęcia' then 'zajecia' else r.typ_dnia end)::public.typ_dnia,
         r.plan_dnia, r.nr_tygodnia, coalesce(r.opis, '')
  from jsonb_to_recordset(payload -> 'kalendarz') as r (
    data date, dzien_tygodnia text, typ_dnia text, plan_dnia smallint, nr_tygodnia smallint, opis text
  );

  insert into public.sale (id, nazwa, budynek, typ, pojemnosc, pojemnosc_szacowana, metraz_m2, wyposazenie,
                           przeznaczenie, dostepna_do_planowania, uwagi)
  select r.id, r.nazwa, r.budynek, r.typ, r.pojemnosc, r.pojemnosc_szacowana, r.metraz_m2,
         array(select jsonb_array_elements_text(r.wyposazenie)), r.przeznaczenie, r.dostepna_do_planowania, r.uwagi
  from jsonb_to_recordset(payload -> 'sale') as r (
    id text, nazwa text, budynek text, typ text, pojemnosc integer, pojemnosc_szacowana boolean,
    metraz_m2 numeric, wyposazenie jsonb, przeznaczenie text, dostepna_do_planowania boolean, uwagi text
  );

  insert into public.prowadzacy_plan (id, stopien, nazwa, jednostka, czlonek_rady_wydzialu)
  select r.id, r.stopien, r.nazwa, r.jednostka, r.czlonek_rady_wydzialu
  from jsonb_to_recordset(payload -> 'prowadzacy') as r (
    id text, stopien text, nazwa text, jednostka text, czlonek_rady_wydzialu boolean
  );

  insert into public.roczniki (id, kierunek, stopien_studiow, rok, semestr, nazwa, liczba_studentow, syntetyczny)
  select r.id, r.kierunek, r.stopien_studiow, r.rok, r.semestr, r.nazwa, r.liczba_studentow, r.syntetyczny
  from jsonb_to_recordset(payload -> 'roczniki') as r (
    id text, kierunek text, stopien_studiow text, rok smallint, semestr smallint, nazwa text,
    liczba_studentow integer, syntetyczny boolean
  );

  -- One statement for all groups: the self-reference (grupa_nadrzedna) is checked once every row exists.
  insert into public.grupy_plan (id, rocznik_id, nazwa, typ, podzial, grupa_nadrzedna, liczba_studentow)
  select r.id, r.rocznik, r.nazwa, r.typ, r.podzial, r.grupa_nadrzedna, r.liczba_studentow
  from jsonb_to_recordset(payload -> 'grupy') as r (
    id text, rocznik text, nazwa text, typ text, podzial text, grupa_nadrzedna text, liczba_studentow integer
  );

  insert into public.studenci (id, rocznik_id)
  select r.id, r.rocznik
  from jsonb_to_recordset(payload -> 'studenci') as r (id text, rocznik text);

  insert into public.studenci_grupy (student_id, grupa_id)
  select r.student, r.grupa
  from jsonb_to_recordset(payload -> 'studenci_grupy') as r (student text, grupa text);

  insert into public.kolizje_grup (grupa_a, grupa_b, wspolni_studenci)
  select r.grupa_a, r.grupa_b, r.wspolni_studenci
  from jsonb_to_recordset(payload -> 'kolizje_grup') as r (grupa_a text, grupa_b text, wspolni_studenci integer);

  insert into public.przedmioty_plan (id, rocznik_id, nazwa)
  select r.id, r.rocznik, r.nazwa
  from jsonb_to_recordset(payload -> 'przedmioty') as r (id text, rocznik text, nazwa text);

  insert into public.zajecia_plan (
    id, rocznik_id, przedmiot_id, forma, liczba_studentow, laczone_z, dodatkowi_studenci, godziny_programowe,
    liczba_spotkan, sloty_na_spotkanie, czestotliwosc, tydzien_od, tydzien_do, typy_sal, dozwolone_sale,
    wymagane_wyposazenie, tryb, powiazanie, typ_powiazania, tygodnie_niedostepne, uwagi
  )
  select r.id, r.rocznik, r.przedmiot_id, r.forma, r.liczba_studentow, r.laczone_z, coalesce(r.dodatkowi_studenci, 0),
         r.godziny_programowe, r.liczba_spotkan, r.sloty_na_spotkanie, r.czestotliwosc, r.tydzien_od, r.tydzien_do,
         array(select jsonb_array_elements_text(r.typy_sal)),
         array(select jsonb_array_elements_text(r.dozwolone_sale)),
         array(select jsonb_array_elements_text(r.wymagane_wyposazenie)),
         r.tryb, r.powiazanie, r.typ_powiazania,
         array(select (jsonb_array_elements_text(r.tygodnie_niedostepne))::smallint),
         r.uwagi
  from jsonb_to_recordset(payload -> 'zajecia') as r (
    id text, rocznik text, przedmiot_id text, forma text, liczba_studentow integer, laczone_z text,
    dodatkowi_studenci integer, godziny_programowe integer, liczba_spotkan smallint, sloty_na_spotkanie smallint,
    czestotliwosc text, tydzien_od smallint, tydzien_do smallint, typy_sal jsonb, dozwolone_sale jsonb,
    wymagane_wyposazenie jsonb, tryb text, powiazanie text, typ_powiazania text, tygodnie_niedostepne jsonb,
    uwagi text
  );

  insert into public.zajecia_plan_grupy (zajecia_id, grupa_id)
  select r.id, g.grupa
  from jsonb_to_recordset(payload -> 'zajecia') as r (id text, grupy jsonb)
  cross join lateral jsonb_array_elements_text(r.grupy) as g (grupa);

  insert into public.zajecia_plan_prowadzacy (zajecia_id, prowadzacy_id)
  select r.id, p.prowadzacy
  from jsonb_to_recordset(payload -> 'zajecia') as r (id text, prowadzacy jsonb)
  cross join lateral jsonb_array_elements_text(r.prowadzacy) as p (prowadzacy);

  insert into public.blokady_stale (grupa_id, dzien, slot_od, slot_do, opis)
  select r.grupa, r.dzien, r.slot_od, r.slot_do, r.opis
  from jsonb_to_recordset(payload -> 'blokady_stale') as r (
    grupa text, dzien smallint, slot_od smallint, slot_do smallint, opis text
  );

  insert into public.rada_wydzialu (dzien, slot_od, slot_do, opis)
  select r.dzien, r.slot_od, r.slot_do, r.opis
  from jsonb_to_recordset(payload -> 'rada_wydzialu') as r (dzien smallint, slot_od smallint, slot_do smallint, opis text);

  insert into public.dezyderaty_terminy (prowadzacy_id, dzien, slot, typ)
  select r.prowadzacy, r.dzien, r.slot, r.typ
  from jsonb_to_recordset(payload -> 'dezyderaty_terminy') as r (prowadzacy text, dzien smallint, slot smallint, typ text);

  insert into public.dezyderaty_ogolne (prowadzacy_id, liczba_godzin_wykluczonych, powod_wykluczen, preferencja_dni, inne_uwagi)
  select r.prowadzacy, r.liczba_godzin_wykluczonych, r.powod_wykluczen, r.preferencja_dni, r.inne_uwagi
  from jsonb_to_recordset(payload -> 'dezyderaty_ogolne') as r (
    prowadzacy text, liczba_godzin_wykluczonych integer, powod_wykluczen text, preferencja_dni text, inne_uwagi text
  );

  insert into public.dezyderaty_sale (prowadzacy_id, przedmiot, forma, rodzaj_sali_nr, sprzet)
  select r.prowadzacy, r.przedmiot, r.forma, r.rodzaj_sali_nr, r.sprzet
  from jsonb_to_recordset(payload -> 'dezyderaty_sale') as r (
    prowadzacy text, przedmiot text, forma text, rodzaj_sali_nr text, sprzet text
  );

  return jsonb_build_object(
    'zajecia', (select count(*) from public.zajecia_plan),
    'sale', (select count(*) from public.sale),
    'prowadzacy', (select count(*) from public.prowadzacy_plan),
    'grupy', (select count(*) from public.grupy_plan),
    'roczniki', (select count(*) from public.roczniki),
    'studenci', (select count(*) from public.studenci)
  );
end
$$;

revoke all on function public.wgraj_dane_planu(jsonb) from public, anon, authenticated;
grant execute on function public.wgraj_dane_planu(jsonb) to service_role;
