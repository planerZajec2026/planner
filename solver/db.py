"""Dostęp do bazy Supabase (Postgres): dane wejściowe generatora i kolejka zadań `generation_jobs`."""

from __future__ import annotations

import os
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .data import Dane, z_slownika
from .validator import Przydzial

# Lokalny stos `supabase start` / `supabase db start`.
DOMYSLNY_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Zadanie `running` starsze niż ta liczba sekund uchodzi za przerwane (worker padł w trakcie liczenia).
PRZETERMINOWANE_SEKUNDY = 3600


def polacz(url: str | None = None) -> psycopg.Connection:
    # autocommit: transakcje otwieramy jawnie (`conn.transaction()`), a długie liczenie nie trzyma otwartej transakcji.
    return psycopg.connect(url or os.environ.get("DATABASE_URL", DOMYSLNY_URL), row_factory=dict_row, autocommit=True)


def _wiersze(conn: psycopg.Connection, sql: str) -> list[dict[str, Any]]:
    return conn.execute(sql).fetchall()


def wczytaj_z_bazy(conn: psycopg.Connection) -> Dane:
    """Buduje `Dane` z tabel w bazie, w tym samym kształcie co `requirements/dane_planu.json`."""
    zajecia = _wiersze(
        conn,
        """
        select z.id, z.rocznik_id as rocznik, z.przedmiot_id, p.nazwa as przedmiot, z.forma,
               z.liczba_studentow, z.laczone_z, z.dodatkowi_studenci, z.liczba_spotkan,
               z.sloty_na_spotkanie, z.czestotliwosc, z.tydzien_od, z.tydzien_do, z.typy_sal,
               z.dozwolone_sale, z.wymagane_wyposazenie, z.powiazanie, z.typ_powiazania,
               z.tygodnie_niedostepne,
               coalesce((select array_agg(g.grupa_id order by g.grupa_id)
                         from public.zajecia_plan_grupy g where g.zajecia_id = z.id), '{}') as grupy,
               coalesce((select array_agg(w.prowadzacy_id order by w.prowadzacy_id)
                         from public.zajecia_plan_prowadzacy w where w.zajecia_id = z.id), '{}') as prowadzacy
        from public.zajecia_plan z
        join public.przedmioty_plan p on p.id = z.przedmiot_id
        order by z.id
        """,
    )
    kalendarz = _wiersze(
        conn, "select data::text as data, typ_dnia::text as typ_dnia, plan_dnia, nr_tygodnia from public.kalendarz order by data"
    )
    return z_slownika(
        {
            "zajecia": zajecia,
            "sale": _wiersze(
                conn,
                "select id, typ, pojemnosc, wyposazenie, dostepna_do_planowania from public.sale order by id",
            ),
            "prowadzacy": _wiersze(
                conn, "select id, czlonek_rady_wydzialu from public.prowadzacy_plan order by id"
            ),
            "grupy": _wiersze(
                conn,
                "select id, rocznik_id as rocznik, grupa_nadrzedna, liczba_studentow from public.grupy_plan order by id",
            ),
            "studenci_grupy": _wiersze(
                conn, "select student_id as student, grupa_id as grupa from public.studenci_grupy"
            ),
            "kolizje_grup": _wiersze(conn, "select grupa_a, grupa_b from public.kolizje_grup"),
            "blokady_stale": _wiersze(
                conn, "select grupa_id as grupa, dzien, slot_od, slot_do from public.blokady_stale order by id"
            ),
            "rada_wydzialu": _wiersze(conn, "select dzien, slot_od, slot_do from public.rada_wydzialu order by id"),
            "dezyderaty_terminy": _wiersze(
                conn, "select prowadzacy_id as prowadzacy, dzien, slot, typ from public.dezyderaty_terminy"
            ),
            "dezyderaty_ogolne": _wiersze(
                conn, "select prowadzacy_id as prowadzacy, preferencja_dni from public.dezyderaty_ogolne"
            ),
            "kalendarz": kalendarz,
        }
    )


def zajmij_zadanie(conn: psycopg.Connection) -> dict[str, Any] | None:
    """Atomowo bierze najstarsze zadanie `queued` i ustawia `running`; zwraca None, gdy kolejka jest pusta."""
    with conn.transaction():
        return conn.execute(
            """
            update public.generation_jobs
            set status = 'running', rozpoczeto = now()
            where id = (
              select id from public.generation_jobs
              where status = 'queued'
              order by utworzono
              limit 1
              for update skip locked
            )
            returning id, parametry
            """
        ).fetchone()


def zakoncz_przerwane(conn: psycopg.Connection) -> int:
    """Zadania `running` od dawna to ślad po workerze, który padł. Oznaczamy je jako nieudane."""
    with conn.transaction():
        return conn.execute(
            """
            update public.generation_jobs
            set status = 'failed', zakonczono = now(), blad = 'Przerwane: worker przestał odpowiadać'
            where status = 'running' and rozpoczeto < now() - make_interval(secs => %s)
            """,
            (PRZETERMINOWANE_SEKUNDY,),
        ).rowcount


def zapisz_wynik(
    conn: psycopg.Connection, job_id: str, plan: list[Przydzial], raport: dict[str, Any], wynik_miekkich: int
) -> None:
    """Zapisuje plan i oznacza zadanie jako `done` w jednej transakcji."""
    with conn.transaction():
        with conn.cursor() as cur:
            cur.executemany(
                """
                insert into public.plan_zajec (job_id, zajecia_id, dzien, slot, sala_id, tygodnie)
                values (%s, %s, %s, %s, %s, %s::smallint[])
                """,
                [(job_id, p.zajecia_id, p.dzien, p.slot, p.sala, list(p.tygodnie)) for p in plan],
            )
        conn.execute(
            """
            update public.generation_jobs
            set status = 'done', zakonczono = now(), raport = %s, wynik_miekkich = %s
            where id = %s
            """,
            (Jsonb(raport), wynik_miekkich, job_id),
        )


def zapisz_blad(conn: psycopg.Connection, job_id: str, blad: str, raport: dict[str, Any] | None = None) -> None:
    with conn.transaction():
        conn.execute(
            """
            update public.generation_jobs
            set status = 'failed', zakonczono = now(), blad = %s, raport = %s
            where id = %s
            """,
            (blad[:2000], Jsonb(raport) if raport is not None else None, job_id),
        )
