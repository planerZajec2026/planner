"""Domyślne wagi ograniczeń miękkich. Wynik planu to suma waga * wartość surowa (mniej = lepiej)."""

DOMYSLNE_WAGI: dict[str, int] = {
    "preferencja_dni": 5,  # skumulowane / nieskumulowane prowadzącego
    "okienka_studentow": 3,  # puste sloty między zajęciami grupy w dniu
    "okienka_prowadzacych": 2,  # puste sloty między zajęciami prowadzącego w dniu
    "poza_godzinami": 1,  # sloty zajęć przed 9:00 (slot 1) i po 17:00 (sloty 10-12)
    "przeciazenie_dnia": 4,  # sloty grupy w dniu ponad limit
    "zla_wielkosc_sali": 1,  # wolne miejsca w sali, w punktach procentowych
}

LIMIT_SLOTOW_W_DNIU = 8
PIERWSZY_SLOT_POZNY = 10
