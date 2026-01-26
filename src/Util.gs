/** Util.gs */
function ok(data) {
  return { ok: true, data };
}
function fail(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

function toISODate_(d) {
  // d: Date
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function parseISODate_(iso) {
  // iso: 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function nowIso_() {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss");
}

function genReservationId_() {
  // 衝突しにくいID（日時＋乱数）
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const rnd = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
  return `R${ts}-${rnd}`;
}

function sanitizeTime_(t) {
  // 'HH:MM' or '' (null/undefined -> '')
  if (!t) return '';
  if (!/^\d{2}:\d{2}$/.test(t)) throw new Error(`Invalid time format: ${t}`);
  return t;
}

function timeToMin_(t) {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

function slotBounds_(slot) {
  const def = CONFIG.SLOT[slot];
  if (!def) throw new Error(`Unknown slot: ${slot}`);
  return { start: timeToMin_(def.start), end: timeToMin_(def.end) };
}

function normalizeTimeRange_(slot, startTime, endTime) {
  // 時間指定が無いなら null を返し、「枠全体占有」とみなす
  startTime = sanitizeTime_(startTime);
  endTime = sanitizeTime_(endTime);

  if (!startTime || !endTime) return null;

  const b = slotBounds_(slot);
  const s = timeToMin_(startTime);
  const e = timeToMin_(endTime);
  if (!(s < e)) throw new Error('start_time must be < end_time');

  // slot内に収める
  if (s < b.start || e > b.end) {
    throw new Error(`Time range ${startTime}-${endTime} is out of slot ${slot} bounds`);
  }
  return { s, e, label: `${startTime}–${endTime}` };
}

/**
 * Date型または文字列をISO形式(YYYY-MM-DD)に正規化
 */
function normalizeToISO_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return toISODate_(val);
  }
  const s = String(val);
  // 既にISO形式ならそのまま
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Date文字列（例："Mon Jan 26 2026..."）をパース
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return toISODate_(d);
  }
  return s;
}
