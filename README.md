# Lefety (angolul: Slurp)

Egyszerű, reklámmentes folyadéknapló magyarul és angolul. Korábbi neve Vízmérő. Telefonon a kezdőképernyőre téve appként működik (PWA), első megnyitás után internet nélkül is.

**Megnyitás:** https://robertjavorszki-eng.github.io/Vizmero/

## Tudnivalók

- Az adatok csak a telefon böngészőjében tárolódnak, az app nem küld el semmit, nincs fiók és nincs reklám.
- Biztonsági mentés: Beállítások → Mód: Haladó → Adatok → Mentés fájlba.
- Kezdőképernyőre tétel:
  - **iPhone (Safari):** Megosztás → Főképernyőhöz adás
  - **Android (Chrome):** ⋮ menü → Hozzáadás a kezdőképernyőhöz

## Fájlok

| Fájl | Mire való |
| --- | --- |
| `index.html` | Maga az app (felület, logika, stílus egy fájlban) |
| `manifest.webmanifest` | Név, ikon, színek, hogy a telefon appként kezelje |
| `sw.js` | Offline működés (service worker) |
| `icons/` | App-ikonok |
| `version.json` | Az aktuális verziószám; ebből veszi észre az app, hogy van újabb |

## Új verzió kiadása

Három helyen kell ugyanarra emelni a verziót:

1. `version.json` → `{"v":"9.5"}`
2. `index.html` → `const APP_VERSION='9.5';`
3. `sw.js` → `const VERSION = 'vizmero-v9.5';`

A megnyitott app az előtérbe hozáskor (és félóránként) megnézi a `version.json`-t, és ha újabb verziót talál, magától betölti, majd kiírja: „Frissítve a legújabb változatra.”
