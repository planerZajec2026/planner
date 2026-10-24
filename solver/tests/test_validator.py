"""Każde ograniczenie twarde 1-10 ma test, który je łamie, i test planu poprawnego."""

from __future__ import annotations

from solver.validator import waliduj

from .conftest import przydzial, zajecia, zbuduj


def numery(dane, plan) -> set[int]:
    return {n.ograniczenie for n in waliduj(dane, plan).naruszenia}


def test_poprawny_plan_nie_ma_naruszen(dane):
    plan = [przydzial("Z1", dzien=1, slot=1), przydzial("Z2", dzien=3, slot=1, sala="S4")]
    # Z1 (cały rocznik) i Z2 (podgrupa) kolidują, ale są w różne dni.
    assert waliduj(dane, plan).naruszenia == []


def test_1_brak_przydzialu(dane):
    assert 1 in numery(dane, [przydzial("Z1")])


def test_1_podwojny_przydzial(dane):
    plan = [przydzial("Z1"), przydzial("Z1", dzien=2), przydzial("Z2", dzien=3, sala="S4")]
    assert 1 in numery(dane, plan)


def test_1_slot_poza_zakresem(dane):
    plan = [przydzial("Z1", slot=12), przydzial("Z2", dzien=3, sala="S4")]  # 2 sloty od 12 -> 13
    assert 1 in numery(dane, plan)


def test_1_dzien_poza_zakresem(dane):
    plan = [przydzial("Z1", dzien=6), przydzial("Z2", dzien=3, sala="S4")]
    assert 1 in numery(dane, plan)


def test_2_za_malo_tygodni(dane):
    plan = [przydzial("Z1", tygodnie=range(1, 14)), przydzial("Z2", dzien=3, sala="S4")]
    assert 2 in numery(dane, plan)


def test_2_co_2_tygodnie_parzyste_lub_nieparzyste():
    z = zajecia("Z1", czestotliwosc="co_2_tygodnie", liczba_spotkan=7)
    d = zbuduj(zajecia_lista=[z])
    assert numery(d, [przydzial("Z1", dzien=3, tygodnie=range(1, 15, 2))]) == set()
    assert numery(d, [przydzial("Z1", dzien=3, tygodnie=range(2, 15, 2))]) == set()
    assert 2 in numery(d, [przydzial("Z1", dzien=3, tygodnie=[1, 3, 5, 7, 9, 11, 14])])


def test_2_tydzien_niedostepny_i_zakres():
    z = zajecia("Z1", tydzien_od=6, tydzien_do=14, liczba_spotkan=8, tygodnie_niedostepne=[7])
    d = zbuduj(zajecia_lista=[z])
    assert numery(d, [przydzial("Z1", dzien=3, tygodnie=[6, 8, 9, 10, 11, 12, 13, 14])]) == set()
    assert 2 in numery(d, [przydzial("Z1", dzien=3, tygodnie=range(7, 15))])
    assert 2 in numery(d, [przydzial("Z1", dzien=3, tygodnie=[5, 6, 8, 9, 10, 11, 12, 13])])


def test_2_wybrane_tygodnie_dowolny_podzbior():
    z = zajecia("Z1", czestotliwosc="wybrane_tygodnie", liczba_spotkan=3)
    d = zbuduj(zajecia_lista=[z])
    assert numery(d, [przydzial("Z1", dzien=3, tygodnie=[2, 5, 11])]) == set()
    assert 2 in numery(d, [przydzial("Z1", dzien=3, tygodnie=[2, 5])])


def test_3_prowadzacy_nakladajace_sie_zajecia():
    d = zbuduj(zajecia_lista=[zajecia("Z1"), zajecia("Z2", grupy=["R2-ALL"])])
    plan = [przydzial("Z1", dzien=3, slot=1), przydzial("Z2", dzien=3, slot=2, sala="S4")]
    assert numery(d, plan) == {3}


def test_3_rozne_tygodnie_nie_nakladaja_sie():
    z1 = zajecia("Z1", liczba_spotkan=7, tydzien_do=7)
    z2 = zajecia("Z2", liczba_spotkan=7, tydzien_od=8, grupy=["R2-ALL"])
    d = zbuduj(zajecia_lista=[z1, z2])
    plan = [
        przydzial("Z1", dzien=3, tygodnie=range(1, 8)),
        przydzial("Z2", dzien=3, tygodnie=range(8, 15)),
    ]
    assert numery(d, plan) == set()


def test_3_sasiednie_sloty_nie_nakladaja_sie():
    d = zbuduj(zajecia_lista=[zajecia("Z1"), zajecia("Z2", grupy=["R2-ALL"])])
    plan = [przydzial("Z1", dzien=3, slot=1), przydzial("Z2", dzien=3, slot=3, sala="S4")]
    assert numery(d, plan) == set()


def test_4_sala_zajeta_podwojnie():
    d = zbuduj(zajecia_lista=[zajecia("Z1"), zajecia("Z2", prowadzacy=["P02"], grupy=["R2-ALL"])])
    plan = [przydzial("Z1", dzien=3), przydzial("Z2", dzien=3)]
    assert numery(d, plan) == {4}


def test_5_wspolni_studenci(dane):
    # Z1 to cały rocznik, Z2 podgrupa tego rocznika: wspólni studenci.
    plan = [przydzial("Z1", dzien=3), przydzial("Z2", dzien=3, sala="S4")]
    assert numery(dane, plan) == {5}


def test_5_rozlaczne_grupy_nie_koliduja():
    d = zbuduj(
        zajecia_lista=[
            zajecia("Z1", grupy=["R1-G1"]),
            zajecia("Z2", grupy=["R1-G2"], prowadzacy=["P02"]),
        ]
    )
    plan = [przydzial("Z1", dzien=3), przydzial("Z2", dzien=3, sala="S4")]
    assert numery(d, plan) == set()


def test_6_nieprawidlowy_typ_dostepnosc_i_wyposazenie():
    d = zbuduj(zajecia_lista=[zajecia("Z1", wymagane_wyposazenie=["projektor"])])
    assert 6 in numery(d, [przydzial("Z1", dzien=3, sala="S4")])  # brak projektora
    assert 6 in numery(d, [przydzial("Z1", dzien=3, sala="S3")])  # typ i niedostępna
    assert numery(d, [przydzial("Z1", dzien=3, sala="S1")]) == set()


def test_6_dozwolone_sale_omija_dostepnosc():
    d = zbuduj(zajecia_lista=[zajecia("Z1", typy_sal=[], dozwolone_sale=["S3"])])
    assert numery(d, [przydzial("Z1", dzien=3, sala="S3")]) == set()
    assert 6 in numery(d, [przydzial("Z1", dzien=3, sala="S1")])


def test_7_pojemnosc_z_dodatkowymi_studentami():
    d = zbuduj(zajecia_lista=[zajecia("Z1", liczba_studentow=8, dodatkowi_studenci=3)])
    assert 7 in numery(d, [przydzial("Z1", dzien=3, sala="S2")])  # 10 miejsc < 11
    assert numery(d, [przydzial("Z1", dzien=3, sala="S1")]) == set()


def test_8_wykluczenie_prowadzacego():
    d = zbuduj(zajecia_lista=[zajecia("Z1")])
    assert 8 in numery(d, [przydzial("Z1", dzien=1, slot=4)])  # slot 5 jest drugim slotem
    assert numery(d, [przydzial("Z1", dzien=1, slot=6)]) == set()


def test_8_rada_wydzialu_tylko_dla_czlonkow():
    d = zbuduj(zajecia_lista=[zajecia("Z1", prowadzacy=["P02"]), zajecia("Z2", grupy=["R2-ALL"])])
    zle = [przydzial("Z1", dzien=2, slot=9), przydzial("Z2", dzien=3, sala="S4")]
    assert 8 in numery(d, zle)
    dobre = [przydzial("Z1", dzien=3), przydzial("Z2", dzien=2, slot=9, sala="S4")]
    assert numery(d, dobre) == set()


def test_9_blokada_stala_dotyczy_tez_kolidujacych_grup():
    blokady = [{"grupa": "R1-ALL", "dzien": 4, "slot_od": 1, "slot_do": 4}]
    d = zbuduj(
        zajecia_lista=[
            zajecia("Z1", grupy=["R1-G1"]),
            zajecia("Z2", grupy=["R2-ALL"], prowadzacy=["P02"]),
        ],
        blokady_stale=blokady,
    )
    plan = [przydzial("Z1", dzien=4, slot=3), przydzial("Z2", dzien=4, slot=1, sala="S4")]
    assert numery(d, plan) == {9}


def test_10_rozne_dni():
    z1 = zajecia("Z1", powiazanie="POW", typ_powiazania="rozne_dni", grupy=["R2-ALL"])
    z2 = zajecia("Z2", powiazanie="POW", typ_powiazania="rozne_dni", grupy=["R2-ALL"], prowadzacy=["P02"])
    d = zbuduj(zajecia_lista=[z1, z2])
    ten_sam = [przydzial("Z1", dzien=2, slot=1), przydzial("Z2", dzien=2, slot=5, sala="S4")]
    assert 10 in numery(d, ten_sam)
    rozne = [przydzial("Z1", dzien=2, slot=1), przydzial("Z2", dzien=3, slot=1, sala="S4")]
    assert 10 not in numery(d, rozne)


def test_10_ten_sam_termin():
    wspolne = {"powiazanie": "POW", "typ_powiazania": "ten_sam_termin", "liczba_spotkan": 7}
    z1 = zajecia("Z1", tydzien_do=7, **wspolne)
    z2 = zajecia("Z2", tydzien_od=8, prowadzacy=["P02"], **wspolne)
    d = zbuduj(zajecia_lista=[z1, z2])
    t1, t2 = range(1, 8), range(8, 15)
    ok = [przydzial("Z1", dzien=3, tygodnie=t1), przydzial("Z2", dzien=3, tygodnie=t2)]
    assert numery(d, ok) == set()
    zle = [przydzial("Z1", dzien=3, tygodnie=t1), przydzial("Z2", dzien=3, slot=3, tygodnie=t2)]
    assert numery(d, zle) == {10}


def test_miekkie_okienka_i_poza_godzinami():
    wspolne = {"sloty_na_spotkanie": 1, "grupy": ["R2-ALL"], "liczba_spotkan": 1, "tydzien_do": 1}
    d = zbuduj(zajecia_lista=[zajecia("Z1", **wspolne), zajecia("Z2", prowadzacy=["P02"], **wspolne)])
    plan = [
        przydzial("Z1", dzien=3, slot=1, tygodnie=[1]),
        przydzial("Z2", dzien=3, slot=4, sala="S4", tygodnie=[1]),
    ]
    r = waliduj(d, plan)
    assert r.naruszenia == []
    assert r.miekkie["okienka_studentow"] == 2  # sloty 2 i 3 puste
    assert r.miekkie["poza_godzinami"] == 1  # slot 1
    assert r.wynik_miekkich > 0
