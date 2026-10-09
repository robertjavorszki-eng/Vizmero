# Vízmérő

Egyszerű, reklámmentes vízivás-napló magyarul. Telefonon a kezdőképernyőre téve appként működik (PWA), első megnyitás után internet nélkül is.

**Megnyitás:** https://robertjavorszki-eng.github.io/vizmero/

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

Frissítéskor a `sw.js` elején a `VERSION` értékét emelni kell, hogy a telefonok letöltsék az új változatot.
