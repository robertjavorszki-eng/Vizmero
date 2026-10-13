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

Három helyen kell ugyanarra emelni a verziót, és be kell írni az újdonságokat:

1. `version.json` → `{"v":"14.11"}`
2. `index.html` → `const APP_VERSION='14.11';`
3. `sw.js` → `const VERSION = 'vizmero-v14.11';`
4. `index.html` → a `CHANGES` lista elejére egy új bejegyzés ugyanazzal a verziószámmal, rövid magyar és angol pontokkal. Ezt mutatja meg az app frissítés után a „Mi újság?” ablakban, és ez jelenik meg a súgó „Újdonságok” fejezetében. Ha a `CHANGES` első eleme nem az aktuális verzió, az ablak nem jelenik meg.

A megnyitott app az előtérbe hozáskor (és félóránként) megnézi a `version.json`-t, és ha újabb verziót talál, magától betölti, majd megmutatja, mi újság.
