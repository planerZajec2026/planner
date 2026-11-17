"""Worker: walidacja parametrów (zawsze) i przepływ zadania przez prawdziwą bazę (opt-in).

Testy z bazą wymagają uruchomionego Supabase z danymi (`npx supabase db reset`) i `RUN_DB_TESTS=1`. Biorą zadania
z kolejki, więc nie uruchamiaj ich na bazie, w której czekają cudze zadania `queued`.
"""

from __future__ import annotations

import os

import pytest

pytest.importorskip("ortools")
psycopg = pytest.importorskip("psycopg")

from solver import db, worker
from solver.data import wczytaj
from solver.worker import BladParametrow, odczytaj_parametry, przetworz_zadanie


def test_domyslne_parametry():
    assert odczytaj_parametry({}) == (200.0, {})


def test_poprawne_parametry():
    parametry = {"limit_czasu": 300, "wagi": {"poza_godzinami": 3}}
    assert odczytaj_parametry(parametry) == (300.0, {"poza_godzinami": 3})


@pytest.mark.parametrize("limit", [200, 400])
def test_granice_limitu_czasu_sa_dozwolone(limit):
    assert odczytaj_parametry({"limit_czasu": limit})[0] == limit


@pytest.mark.parametrize(
    "parametry",
    [
        {"limit_czasu": 0},
        {"limit_czasu": 199},
        {"limit_czasu": 401},
        {"limit_czasu": "120"},
        {"limit_czasu": True},
        {"wagi": [1]},
        {"wagi": {"nie_ma_takiej": 1}},
        {"wagi": {"poza_godzinami": -1}},
        {"wagi": {"poza_godzinami": 1.5}},
    ],
)
def test_bledne_parametry(parametry):
    with pytest.raises(BladParametrow):
        odczytaj_parametry(parametry)


# --- z bazą -----------------------------------------------------------------------------------------

pytestmark_db = pytest.mark.skipif(os.environ.get("RUN_DB_TESTS") != "1", reason="ustaw RUN_DB_TESTS=1 i uruchom bazę")


@pytest.fixture
def krotki_limit(monkeypatch):
    """Testy z bazą nie czekają 200 s: obniżamy dolną granicę limitu tylko na czas testu."""
    monkeypatch.setattr(worker, "MINIMALNY_LIMIT_CZASU", 1.0)


@pytest.fixture
def conn():
    try:
        polaczenie = db.polacz()
    except psycopg.OperationalError as e:
        pytest.skip(f"brak bazy: {e}")
    with polaczenie:
        yield polaczenie


@pytest.fixture
def zadanie(conn):
    """Tworzy zadanie `queued` z podanymi parametrami i sprząta po teście."""
    utworzone: list[str] = []

    def utworz(parametry: dict) -> str:
        from psycopg.types.json import Jsonb

        wiersz = conn.execute(
            "insert into public.generation_jobs (parametry) values (%s) returning id", (Jsonb(parametry),)
        ).fetchone()
        utworzone.append(str(wiersz["id"]))
        return utworzone[-1]

    yield utworz
    for job_id in utworzone:
        conn.execute("delete from public.generation_jobs where id = %s", (job_id,))


@pytestmark_db
def test_dane_z_bazy_sa_takie_same_jak_z_pliku(conn):
    z_pliku, z_bazy = wczytaj(), db.wczytaj_z_bazy(conn)
    assert z_bazy.zajecia == z_pliku.zajecia
    assert z_bazy.sale == z_pliku.sale
    assert z_bazy.grupy == z_pliku.grupy
    assert z_bazy.kolizje == z_pliku.kolizje
    assert z_bazy.blokady == z_pliku.blokady
    assert z_bazy.wykluczone == z_pliku.wykluczone
    assert z_bazy.preferencje == z_pliku.preferencje
    assert z_bazy.prowadzacy == z_pliku.prowadzacy
    assert [(d.plan_dnia, d.nr_tygodnia) for d in z_bazy.kalendarz] == [
        (d.plan_dnia, d.nr_tygodnia) for d in z_pliku.kalendarz
    ]


@pytestmark_db
def test_zadanie_przechodzi_do_done_i_zapisuje_plan(conn, zadanie, krotki_limit):
    job_id = zadanie({"limit_czasu": 30})
    assert przetworz_zadanie(conn, workers=4)

    job = conn.execute("select * from public.generation_jobs where id = %s", (job_id,)).fetchone()
    assert job["status"] == "done", job["blad"]
    assert job["rozpoczeto"] and job["zakonczono"]
    assert job["raport"]["naruszenia"] == {}
    assert job["wynik_miekkich"] == sum(
        w * job["raport"]["miekkie"][k] for k, w in __import__("solver.weights", fromlist=["x"]).DOMYSLNE_WAGI.items()
    )
    liczba = conn.execute("select count(*) as n from public.plan_zajec where job_id = %s", (job_id,)).fetchone()["n"]
    assert liczba == 174
    spotkania = conn.execute("select count(*) as n from public.plan_spotkania where job_id = %s", (job_id,)).fetchone()
    assert spotkania["n"] > 174
    # Ostatni zapis postępu (spec 15) pochodzi z etapu zapisu wyniku.
    assert job["postep"]["etap"] == "zapis"
    assert job["postep"]["limit_s"] == 30
    assert job["postep"]["uplynelo_s"] > 0
    assert job["postep"]["zaktualizowano"]


@pytestmark_db
def test_postep_trafia_do_bazy_w_trakcie_liczenia(conn, zadanie, krotki_limit, monkeypatch):
    """Wątek postępu musi pisać, gdy główny wątek stoi w solverze, inaczej pasek stałby do końca w miejscu."""
    w_bazie: list[dict] = []
    zapisz = db.zapisz_postep

    def zapisz_i_odczytaj(polaczenie, job_id, stan):
        zapisz(polaczenie, job_id, stan)
        wiersz = polaczenie.execute("select status, postep from public.generation_jobs where id = %s", (job_id,)).fetchone()
        w_bazie.append({"status": wiersz["status"], **wiersz["postep"]})

    monkeypatch.setattr(db, "zapisz_postep", zapisz_i_odczytaj)
    zadanie({"limit_czasu": 20})
    assert przetworz_zadanie(conn, workers=4)

    assert {w["status"] for w in w_bazie} == {"running"}
    assert w_bazie[0]["etap"] == "wczytywanie"
    w_solverze = [w for w in w_bazie if w["etap"] == "optymalizacja"]
    assert len(w_solverze) >= 3, [w["etap"] for w in w_bazie]
    czasy = [w["uplynelo_s"] for w in w_solverze]
    assert czasy == sorted(czasy) and czasy[-1] > czasy[0] > 0
    # Liczby lepszych planów tu nie sprawdzamy: przy tak krótkim limicie solver kończy, zanim zgłosi pierwszy
    # (samo przygotowanie etapu 2 trwa na prawdziwych danych ok. 30 s). Zgłoszenia pokrywa test_model.py.
    assert w_bazie[-1]["etap"] == "zapis"


@pytestmark_db
def test_brak_kolumny_postepu_nie_psuje_zadania(conn, zadanie, krotki_limit, monkeypatch):
    """Worker może wdrożyć się przed migracją: zadanie ma się wtedy policzyć bez postępu."""

    def brak_kolumny(polaczenie, job_id, stan):
        polaczenie.execute("update public.generation_jobs set nie_ma_takiej_kolumny = 1 where id = %s", (job_id,))

    monkeypatch.setattr(db, "zapisz_postep", brak_kolumny)
    job_id = zadanie({"limit_czasu": 10})
    assert przetworz_zadanie(conn, workers=4)

    job = conn.execute("select status, blad, postep from public.generation_jobs where id = %s", (job_id,)).fetchone()
    assert job["status"] == "done", job["blad"]
    assert job["postep"] is None


@pytestmark_db
def test_bledne_parametry_dają_failed(conn, zadanie):
    job_id = zadanie({"limit_czasu": 0})
    assert przetworz_zadanie(conn)
    job = conn.execute("select status, blad from public.generation_jobs where id = %s", (job_id,)).fetchone()
    assert job["status"] == "failed"
    assert "Błędne parametry" in job["blad"]
    assert conn.execute("select count(*) as n from public.plan_zajec where job_id = %s", (job_id,)).fetchone()["n"] == 0


@pytestmark_db
def test_przerwane_zadanie_jest_oznaczane_jako_nieudane(conn, zadanie):
    job_id = zadanie({})
    conn.execute(
        "update public.generation_jobs set status = 'running', rozpoczeto = now() - interval '2 hours' where id = %s",
        (job_id,),
    )
    assert db.zakoncz_przerwane(conn) >= 1
    status = conn.execute("select status from public.generation_jobs where id = %s", (job_id,)).fetchone()["status"]
    assert status == "failed"
