/**
 * Családi terv – Google Táblázat webapp (szerver rész).
 * A felület (kinézet, funkciók) a GitHubról töltődik be, így azt Claude
 * frissíteni tudja. Ez a rész csak a táblázatot olvassa és írja.
 */
const TABLA_ID = '1AZB6jdldYVhzDBC6bLmJDp6I2_98mDvPPOvDepfxaeM';
const LAP = 'Évesterv';
const ELSO_SOR = 4;
const FELULET_URL = 'https://robertjavorszki-eng.github.io/Vizmero/naptar/ui.html';

function tabla_() {
  return TABLA_ID ? SpreadsheetApp.openById(TABLA_ID) : SpreadsheetApp.getActive();
}

function doGet() {
  let html = '';
  const cache = CacheService.getScriptCache();
  try {
    const r = UrlFetchApp.fetch(FELULET_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      html = r.getContentText('UTF-8');
      try { cache.put('felulet', html, 21600); } catch (e) {}
    }
  } catch (e) {}
  if (!html) html = cache.get('felulet') || '<p style="font-family:sans-serif;padding:24px">A felület most nem érhető el. Próbáld újra pár perc múlva.</p>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Családi terv')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function szam_(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
function szoveg_(v) { return v === null || v === undefined ? '' : String(v); }

function tulajdonos_() {
  try {
    const en = Session.getActiveUser().getEmail();
    const owner = tabla_().getOwner();
    return !!en && !!owner && owner.getEmail().toLowerCase() === en.toLowerCase();
  } catch (e) { return false; }
}

// szöveges mezők: oszlop indexe a G..N tartományban (0 = G)
const SZOVEG_MEZOK = { k: 0, p: 1, o: 2, f: 3, n: 7 };

function link_(rt) {
  if (!rt) return '';
  const egesz = rt.getLinkUrl();
  if (egesz) return egesz;
  const runs = rt.getRuns();
  for (let i = 0; i < runs.length; i++) { const u = runs[i].getLinkUrl(); if (u) return u; }
  return '';
}

function napObj_(sor, r, tz, rich) {
  const L = {};
  if (rich) Object.keys(SZOVEG_MEZOK).forEach(function (m) { const u = link_(rich[SZOVEG_MEZOK[m]]); if (u) L[m] = u; });
  return {
    L: L,
    row: sor,
    d: Utilities.formatDate(r[0], tz, 'yyyy-MM-dd'),
    u: szoveg_(r[4]), s: szoveg_(r[5]),
    k: szoveg_(r[6]), p: szoveg_(r[7]), o: szoveg_(r[8]), f: szoveg_(r[9]),
    R: szam_(r[10]), K: szam_(r[11]), h: szoveg_(r[12]), n: szoveg_(r[13])
  };
}

function keretek_(sh) {
  const fent = sh.getRange('D1:H2').getValues();
  return {
    robi: { keret: szam_(fent[0][0]), used: szam_(fent[0][2]) },
    krisz: { keret: szam_(fent[1][0]), used: szam_(fent[1][2]) }
  };
}

function getData() {
  const ss = tabla_();
  const sh = ss.getSheetByName(LAP);
  if (!sh) throw new Error('Nem találom az „' + LAP + '” lapot.');
  const tz = ss.getSpreadsheetTimeZone();
  const db = Math.max(0, sh.getLastRow() - ELSO_SOR + 1);
  const vals = db ? sh.getRange(ELSO_SOR, 1, db, 14).getValues() : [];
  const rich = db ? sh.getRange(ELSO_SOR, 7, db, 8).getRichTextValues() : [];
  const days = [];
  vals.forEach(function (r, i) { if (r[0] instanceof Date) days.push(napObj_(ELSO_SOR + i, r, tz, rich[i])); });
  const k = keretek_(sh);
  return { owner: tulajdonos_(), days: days, robi: k.robi, krisz: k.krisz, lists: listak_(ss) };
}

function saveDay(row, d, x) {
  if (!tulajdonos_()) throw new Error('Csak a táblázat tulajdonosa szerkeszthet.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = tabla_();
    const sh = ss.getSheetByName(LAP);
    const tz = ss.getSpreadsheetTimeZone();
    const datum = sh.getRange(row, 1).getValue();
    if (!(datum instanceof Date) || Utilities.formatDate(datum, tz, 'yyyy-MM-dd') !== d) {
      throw new Error('A táblázat sorai elcsúsztak – frissítsd az appot.');
    }
    const u = function (v) { return v === null || v === undefined ? '' : v; };
    const L = x.L || {};
    const rt = function (m) {
      const t = String(u(x[m]));
      const url = /^https?:\/\//i.test(L[m] || '') ? L[m] : '';
      const b = SpreadsheetApp.newRichTextValue().setText(t || url);
      if (url && (t || url)) b.setLinkUrl(url);
      return b.build();
    };
    sh.getRange(row, 7, 1, 4).setRichTextValues([[rt('k'), rt('p'), rt('o'), rt('f')]]);
    sh.getRange(row, 11, 1, 3).setValues([[u(x.R), u(x.K), u(x.h)]]);
    sh.getRange(row, 14).setRichTextValue(rt('n'));
    SpreadsheetApp.flush();
    const k = keretek_(sh);
    return {
      day: napObj_(row, sh.getRange(row, 1, 1, 14).getValues()[0], tz, sh.getRange(row, 7, 1, 8).getRichTextValues()[0]),
      robi: k.robi, krisz: k.krisz
    };
  } finally { lock.releaseLock(); }
}

/**
 * EGYSZER FUTTATANDÓ: beszúrja 2026. november–december napjait 2027 elé,
 * és felveszi a 2026-os ünnepeket, szüneteket. Többszöri futtatás nem árt.
 * A szerkesztőben fent válaszd ki: honapok2026  →  Futtatás.
 */
function honapok2026() {
  const ss = tabla_();
  const sh = ss.getSheetByName(LAP);
  const tz = ss.getSpreadsheetTimeZone();
  const elso = sh.getRange(ELSO_SOR, 1).getValue();
  if (elso instanceof Date && Utilities.formatDate(elso, tz, 'yyyy-MM-dd') === '2026-11-01') {
    Logger.log('Már be vannak szúrva a 2026-os napok.');
    return;
  }
  const N = 61; // nov 30 + dec 31
  const nap = function (t) { return Utilities.parseDate(t, tz, 'yyyy-MM-dd'); };
  sh.insertRowsBefore(ELSO_SOR, N);
  const minta = ELSO_SOR + N + 1;          // 2027.01.02. sora: közönséges nap
  const uj = sh.getRange(ELSO_SOR, 1, N, 14);
  sh.getRange(minta, 1, 1, 14).copyTo(uj, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sh.getRange(minta, 1, 1, 14).copyTo(uj, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  sh.getRange(minta, 2, 1, 5).copyTo(sh.getRange(ELSO_SOR, 2, N, 5), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
  const datumok = [];
  for (let i = 0; i < N; i++) {
    const t = i < 30 ? '2026-11-' + ('0' + (i + 1)).slice(-2) : '2026-12-' + ('0' + (i - 29)).slice(-2);
    datumok.push([nap(t)]);
  }
  sh.getRange(ELSO_SOR, 1, N, 1).setValues(datumok).setNumberFormat('yyyy.mm.dd');
  const vastag = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  [ELSO_SOR, ELSO_SOR + 30].forEach(function (r) {
    sh.getRange(r, 1, 1, 14).setBorder(true, null, null, null, null, null, '#5B3FD6', vastag);
  });
  // feltételes formázás kiterjesztése az új sorokra
  const regi = ELSO_SOR + N;
  const szabalyok = sh.getConditionalFormatRules().map(function (rule) {
    let bovult = false;
    const tart = rule.getRanges().map(function (rg) {
      if (rg.getRow() === regi) {
        bovult = true;
        return sh.getRange(ELSO_SOR, rg.getColumn(), rg.getNumRows() + N, rg.getNumColumns());
      }
      return rg;
    });
    const b = rule.copy().setRanges(tart);
    const f = rule.getBooleanCondition();
    if (bovult && f && f.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA) {
      const keplet = String(f.getCriteriaValues()[0]).replace(new RegExp('([A-Z])' + regi + '(?![0-9])', 'g'), '$1' + ELSO_SOR);
      b.whenFormulaSatisfied(keplet);
    }
    return b.build();
  });
  sh.setConditionalFormatRules(szabalyok);
  // ünnepek, szünetek
  const sp = ss.getSheetByName('Ünnepek és szünetek');
  if (sp) {
    const v = sp.getRange(5, 1, 56, 4).getValues();
    let ures = -1;
    for (let i = 0; i < v.length; i++) {
      const a = v[i][0];
      if (v[i][2] === 'Téli szünet' && a instanceof Date && Utilities.formatDate(a, tz, 'yyyy') === '2027') {
        sp.getRange(5 + i, 1).setValue(nap('2026-12-19'));
        sp.getRange(5 + i, 5).setValue('2026/27-es tanév rendje: 2026.12.19. – 2027.01.03.');
      }
      if (ures < 0 && !a) ures = i;
    }
    if (ures >= 0) {
      const ujak = [
        [nap('2026-10-23'), nap('2026-11-01'), 'Őszi szünet', 'Szünet', '2026/27-es tanév rendje'],
        [nap('2026-11-01'), nap('2026-11-01'), 'Mindenszentek', 'Ünnep', 'Munka Törvénykönyve 102. §'],
        [nap('2026-12-24'), nap('2026-12-24'), 'Szenteste', 'Ünnep', 'Munka Törvénykönyve 102. §'],
        [nap('2026-12-25'), nap('2026-12-26'), 'Karácsony', 'Ünnep', 'Munka Törvénykönyve 102. §']
      ];
      sp.getRange(5 + ures, 1, ujak.length, 5).setValues(ujak);
      sp.getRange(5 + ures, 1, ujak.length, 2).setNumberFormat('yyyy.mm.dd');
    }
  }
  Logger.log('Kész: 2026. november–december beszúrva.');
}

// ---- Mentett listák (gyakori bejegyzések) a „Listák” lapon ----
const LISTA_LAP = 'Listák';
const LISTA_KULCSOK = ['k', 'p', 'o', 'f'];

function listak_(ss) {
  const out = { k: [], p: [], o: [], f: [] };
  const sh = ss.getSheetByName(LISTA_LAP);
  if (!sh || sh.getLastRow() < 2) return out;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues();
  v.forEach(function (r) {
    LISTA_KULCSOK.forEach(function (key, i) { const t = String(r[i]).trim(); if (t) out[key].push(t); });
  });
  return out;
}

function saveLists(l) {
  if (!tulajdonos_()) throw new Error('Csak a táblázat tulajdonosa szerkeszthet.');
  const ss = tabla_();
  let sh = ss.getSheetByName(LISTA_LAP);
  if (!sh) sh = ss.insertSheet(LISTA_LAP);
  sh.clearContents();
  const fej = [['Kristóf', 'Panna', 'Oli', 'Család']];
  sh.getRange(1, 1, 1, 4).setValues(fej).setFontWeight('bold');
  sh.setFrozenRows(1);
  const max = Math.max.apply(null, LISTA_KULCSOK.map(function (key) { return (l[key] || []).length; }).concat([0]));
  if (max) {
    const sorok = [];
    for (let i = 0; i < max; i++) {
      sorok.push(LISTA_KULCSOK.map(function (key) { return (l[key] || [])[i] || ''; }));
    }
    sh.getRange(2, 1, max, 4).setValues(sorok);
  }
  return listak_(ss);
}
