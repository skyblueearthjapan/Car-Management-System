# GAS雛形一式（DB v1.1前提）

そのままコピペで Apps Script プロジェクトに貼れるコード一式。

## 使い始めにやること

1. DBスプレッドシートID を `CONFIG.DB_SPREADSHEET_ID` に入れる
2. 同期元IDは既に `CONFIG.MASTER_SOURCE_SPREADSHEET_ID` に入れてあります（必要なら変更）
3. DBシート名がテンプレと違う場合は `CONFIG.SHEETS` を合わせる

---

## 推奨ファイル構成

- Code.gs（エントリ＋API公開）
- Config.gs（定数）
- Db.gs（シート/ヘッダ解決・共通I/O）
- ReservationService.gs（予約作成/取消/競合）
- MasterSync.gs（部署/作業員同期）
- QueueService.gs（IntegrationQueue処理）
- Util.gs（日時/ID/レスポンス/バリデーション）
- Ui.html（最低限の土台：後でUI実装）

---

## Config.gs

```javascript
/** Config.gs */
const CONFIG = {
  DB_SPREADSHEET_ID: 'PUT_YOUR_DB_SPREADSHEET_ID_HERE', // ★あなたのDBスプレッドシートID
  MASTER_SOURCE_SPREADSHEET_ID: '1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ',

  SHEETS: {
    VEHICLES: 'Vehicles',
    RESERVATIONS: 'Reservations',
    RES_DAYS: 'ReservationDays',
    DEPT: 'DeptMaster',
    WORKER: 'WorkerMaster',
    SYNC_LOG: 'SyncLog',
    QUEUE: 'IntegrationQueue',
    SETTINGS: 'Settings',
  },

  // 固定ルール
  SLOT: {
    AM: { start: '08:00', end: '13:00' },
    PM: { start: '13:00', end: '18:00' },
    FULL: { start: '08:00', end: '18:00' },
  },

  // API default
  QUEUE_BATCH_SIZE: 20,
};
```

---

## Util.gs

```javascript
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
```

---

## Db.gs（ヘッダ解決＆行I/Oの要）

```javascript
/** Db.gs */
function db_() {
  return SpreadsheetApp.openById(CONFIG.DB_SPREADSHEET_ID);
}

function sh_(name) {
  const sheet = db_().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet not found: ${name}`);
  return sheet;
}

function headerMap_(sheet) {
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  values.forEach((h, idx) => {
    if (h && String(h).trim()) map[String(h).trim()] = idx + 1;
  });
  return map;
}

function readAllObjects_(sheetName) {
  const sheet = sh_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function appendObject_(sheetName, obj) {
  const sheet = sh_(sheetName);
  const h = headerMap_(sheet);
  // ヘッダ順に並べてappend
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const row = headers.map(key => (obj[key] !== undefined ? obj[key] : ''));
  sheet.appendRow(row);
}

function updateRowsByKey_(sheetName, keyField, keyValue, patchObj) {
  const sheet = sh_(sheetName);
  const h = headerMap_(sheet);
  if (!h[keyField]) throw new Error(`Key field not found: ${sheetName}.${keyField}`);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const keyCol = h[keyField];
  const range = sheet.getRange(2, keyCol, lastRow - 1, 1).getValues();
  const hitRows = [];
  range.forEach((v, i) => {
    if (String(v[0]) === String(keyValue)) hitRows.push(i + 2);
  });
  if (hitRows.length === 0) return 0;

  // patch columns
  const patchKeys = Object.keys(patchObj).filter(k => h[k]);
  hitRows.forEach(r => {
    patchKeys.forEach(k => {
      sheet.getRange(r, h[k]).setValue(patchObj[k]);
    });
  });
  return hitRows.length;
}

function findRowsByKey_(sheetName, keyField, keyValue) {
  const rows = readAllObjects_(sheetName);
  return rows.filter(r => String(r[keyField]) === String(keyValue));
}
```

---

## ReservationService.gs（予約作成・取消・競合）

```javascript
/** ReservationService.gs */

function getActiveVehicles_() {
  const all = readAllObjects_(CONFIG.SHEETS.VEHICLES);
  return all
    .filter(v => String(v.active).toUpperCase() !== 'FALSE')
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function getDayReservationsJoined_(dateISO) {
  // ReservationDays(date=) を引いて Reservations とJOIN、cancelledは除外
  const days = readAllObjects_(CONFIG.SHEETS.RES_DAYS).filter(r => String(r.date) === String(dateISO));
  if (days.length === 0) return [];

  // ヘッダを一括読み（シンプルに全件 → 今後最適化可）
  const headers = readAllObjects_(CONFIG.SHEETS.RESERVATIONS)
    .filter(h => String(h.status).toLowerCase() === 'active');

  const headerById = new Map(headers.map(h => [String(h.reservation_id), h]));

  return days
    .map(d => {
      const h = headerById.get(String(d.reservation_id));
      if (!h) return null; // cancelled or missing
      return {
        reservation_id: d.reservation_id,
        vehicle_id: h.vehicle_id,
        date: d.date,
        slot: d.slot,
        start_time: d.start_time || '',
        end_time: d.end_time || '',
        dept_name: h.dept_name,
        worker_name: h.worker_name,
        worker_code: h.worker_code,
      };
    })
    .filter(Boolean);
}

function expandDates_(startISO, endISO) {
  const s = parseISODate_(startISO);
  const e = parseISODate_(endISO);
  if (s > e) throw new Error('start_date must be <= end_date');

  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(toISODate_(d));
  }
  return out;
}

function buildConflicts_(vehicleId, dateISO, slot, timeRangeOrNull, existingRows) {
  // existingRows: joined rows for vehicle+date of active reservations
  const conflicts = [];

  // FULLは常に競合（仕様）
  const isFull = slot === 'FULL';
  for (const ex of existingRows) {
    const exSlot = String(ex.slot);
    const exIsFull = exSlot === 'FULL';
    const sameDate = String(ex.date) === String(dateISO);

    if (!sameDate) continue;

    // FULL同士 or FULLとAM/PM
    if (isFull || exIsFull) {
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: (ex.start_time && ex.end_time) ? `${ex.start_time}–${ex.end_time}` : exSlot,
      });
      continue;
    }

    // AM vs PMは競合しない
    if (slot !== exSlot) continue;

    // 同一スロット
    const exTR = normalizeTimeRange_(exSlot, ex.start_time, ex.end_time); // nullなら枠占有
    if (!timeRangeOrNull || !exTR) {
      // 片方でも時間指定無しなら占有＝競合
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: (ex.start_time && ex.end_time) ? `${ex.start_time}–${ex.end_time}` : exSlot,
      });
      continue;
    }

    // 両方時間指定あり：重なり判定
    const overlap = !(timeRangeOrNull.e <= exTR.s || exTR.e <= timeRangeOrNull.s);
    if (overlap) {
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: `${ex.start_time}–${ex.end_time}`,
      });
    }
  }

  return conflicts;
}

function checkConflictsForCreate_(vehicleId, dates, slot, startTime, endTime) {
  const dayJoined = getDayReservationsJoinedBulkByVehicleAndDates_(vehicleId, dates);

  const timeRangeOrNull = normalizeTimeRange_(slot, startTime, endTime); // null=枠占有
  const conflicts = [];

  for (const dateISO of dates) {
    const existing = dayJoined.get(dateISO) || [];
    conflicts.push(...buildConflicts_(vehicleId, dateISO, slot, timeRangeOrNull, existing));
  }
  return conflicts;
}

function getDayReservationsJoinedBulkByVehicleAndDates_(vehicleId, dates) {
  // 取り込み最適化：ReservationDaysを全件読む→filter（まずは簡単版）
  const days = readAllObjects_(CONFIG.SHEETS.RES_DAYS)
    .filter(r => String(r.vehicle_id || '') === '' ? true : true); // vehicle_id列が無い前提なので後で最適化可

  const headers = readAllObjects_(CONFIG.SHEETS.RESERVATIONS)
    .filter(h => String(h.status).toLowerCase() === 'active' && String(h.vehicle_id) === String(vehicleId));

  const headerById = new Map(headers.map(h => [String(h.reservation_id), h]));
  const dateSet = new Set(dates.map(String));

  // ReservationDays は reservation_id, date, slot, start_time, end_time を持つ前提
  const map = new Map(); // dateISO -> joined rows[]
  for (const d of days) {
    if (!dateSet.has(String(d.date))) continue;
    const h = headerById.get(String(d.reservation_id));
    if (!h) continue;
    if (String(h.vehicle_id) !== String(vehicleId)) continue;

    const row = {
      reservation_id: d.reservation_id,
      vehicle_id: h.vehicle_id,
      date: d.date,
      slot: d.slot,
      start_time: d.start_time || '',
      end_time: d.end_time || '',
      dept_name: h.dept_name,
      worker_name: h.worker_name,
      worker_code: h.worker_code,
    };
    if (!map.has(String(d.date))) map.set(String(d.date), []);
    map.get(String(d.date)).push(row);
  }
  return map;
}

function createReservationCore_(payload) {
  // payload validation
  const required = ['vehicle_id', 'start_date', 'end_date', 'slot', 'dept_name', 'worker_code', 'worker_name'];
  required.forEach(k => { if (!payload[k]) throw new Error(`Missing payload.${k}`); });

  const vehicleId = String(payload.vehicle_id);
  const startISO = String(payload.start_date);
  const endISO = String(payload.end_date);
  const slot = String(payload.slot);

  // 時間指定は任意（深い階層）
  const startTime = payload.time_start || payload.start_time || '';
  const endTime = payload.time_end || payload.end_time || '';

  // 期間展開
  const dates = expandDates_(startISO, endISO);

  // 競合チェック
  const conflicts = checkConflictsForCreate_(vehicleId, dates, slot, startTime, endTime);
  if (conflicts.length) {
    return fail('CONFLICT', '既に予約があります。', { conflicts });
  }

  const reservationId = genReservationId_();
  const actor = Session.getActiveUser().getEmail() || 'unknown';
  const ts = nowIso_();

  // ヘッダ作成
  appendObject_(CONFIG.SHEETS.RESERVATIONS, {
    reservation_id: reservationId,
    vehicle_id: vehicleId,
    start_date: startISO,
    end_date: endISO,
    dept_name: payload.dept_name,
    worker_code: payload.worker_code,
    worker_name: payload.worker_name,
    purpose: payload.purpose || '',
    destination: payload.destination || '',
    memo: payload.memo || '',
    source_system: payload.source_system || 'webapp',
    source_id: payload.source_id || '',
    source_url: payload.source_url || '',
    status: 'active',
    created_at: ts,
    created_by: actor,
    updated_at: ts,
    updated_by: actor,
  });

  // 日別明細（全日同一slot）
  // ※ReservationDaysに vehicle_id 列が無い想定。あるなら入れてもOK。
  dates.forEach(dateISO => {
    appendObject_(CONFIG.SHEETS.RES_DAYS, {
      reservation_id: reservationId,
      date: dateISO,
      slot: slot,
      start_time: startTime || '',
      end_time: endTime || '',
    });
  });

  return ok({ reservation_id: reservationId });
}

function cancelReservationCore_(reservationId) {
  const actor = Session.getActiveUser().getEmail() || 'unknown';
  const ts = nowIso_();
  const updated = updateRowsByKey_(CONFIG.SHEETS.RESERVATIONS, 'reservation_id', reservationId, {
    status: 'cancelled',
    updated_at: ts,
    updated_by: actor,
  });
  if (!updated) return fail('NOT_FOUND', '予約が見つかりません。');
  return ok({ reservation_id: reservationId });
}
```

---

## MasterSync.gs（部署/作業員同期）

```javascript
/** MasterSync.gs */
function syncMastersCore_() {
  const src = SpreadsheetApp.openById(CONFIG.MASTER_SOURCE_SPREADSHEET_ID);

  const deptSrc = src.getSheetByName('部署マスタ');
  const workerSrc = src.getSheetByName('作業員マスタ');
  if (!deptSrc || !workerSrc) throw new Error('同期元に「部署マスタ」または「作業員マスタ」がありません。');

  const deptValues = deptSrc.getDataRange().getValues();
  const workerValues = workerSrc.getDataRange().getValues();

  replaceSheetData_(CONFIG.SHEETS.DEPT, deptValues);
  replaceSheetData_(CONFIG.SHEETS.WORKER, workerValues);

  appendObject_(CONFIG.SHEETS.SYNC_LOG, {
    at: nowIso_(),
    result: 'success',
    dept_rows: deptValues.length - 1,
    worker_rows: workerValues.length - 1,
    message: '',
  });

  return ok({ dept: deptValues.length - 1, worker: workerValues.length - 1 });
}

function replaceSheetData_(sheetName, values2d) {
  const sheet = sh_(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, values2d.length, values2d[0].length).setValues(values2d);
}
```

---

## QueueService.gs（IntegrationQueue処理：骨格）

```javascript
/** QueueService.gs */

function processQueueCore_(batchSize) {
  batchSize = Number(batchSize || CONFIG.QUEUE_BATCH_SIZE);

  const sheet = sh_(CONFIG.SHEETS.QUEUE);
  const h = headerMap_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return ok({ processed: 0 });

  // 必須列チェック
  ['queue_id','status','payload_json','attempt_count','last_error','updated_at'].forEach(k=>{
    if(!h[k]) throw new Error(`IntegrationQueue missing column: ${k}`);
  });

  // pending を上から batchSize 件取得
  const statusCol = h.status;
  const statuses = sheet.getRange(2, statusCol, lastRow - 1, 1).getValues().map(r => String(r[0]||''));
  const targetRows = [];
  for (let i = 0; i < statuses.length && targetRows.length < batchSize; i++) {
    if (statuses[i] === 'pending') targetRows.push(i + 2);
  }
  if (!targetRows.length) return ok({ processed: 0 });

  let processed = 0;

  for (const r of targetRows) {
    const payloadJson = sheet.getRange(r, h.payload_json).getValue();
    const attempt = Number(sheet.getRange(r, h.attempt_count).getValue() || 0);

    try {
      const payload = JSON.parse(payloadJson);
      // ここで「source_id」でupsertする設計が理想だが、v1では create のみでもOK
      const res = createReservationCore_(payload);
      if (!res.ok && res.code === 'CONFLICT') {
        sheet.getRange(r, h.status).setValue('conflict');
        sheet.getRange(r, h.last_error).setValue(JSON.stringify(res.conflicts));
      } else if (!res.ok) {
        sheet.getRange(r, h.status).setValue('error');
        sheet.getRange(r, h.last_error).setValue(res.message || 'unknown error');
      } else {
        sheet.getRange(r, h.status).setValue('done');
        sheet.getRange(r, h.last_error).setValue('');
      }
      sheet.getRange(r, h.updated_at).setValue(nowIso_());
      sheet.getRange(r, h.attempt_count).setValue(attempt + 1);
      processed++;
    } catch (e) {
      sheet.getRange(r, h.status).setValue('error');
      sheet.getRange(r, h.last_error).setValue(String(e && e.message ? e.message : e));
      sheet.getRange(r, h.updated_at).setValue(nowIso_());
      sheet.getRange(r, h.attempt_count).setValue(attempt + 1);
      processed++;
    }
  }

  return ok({ processed });
}
```

---

## Code.gs（公開API・排他ロック）

```javascript
/** Code.gs */

function doGet() {
  // UIは後で実装。まずは最低限。
  const t = HtmlService.createTemplateFromFile('Ui');
  return t.evaluate().setTitle('車両予約');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** API: 初期データ */
function getInit(dateISO) {
  dateISO = dateISO || toISODate_(new Date());
  const vehicles = getActiveVehicles_();
  const dayReservations = getDayReservationsJoined_(dateISO);
  const deptList = readAllObjects_(CONFIG.SHEETS.DEPT).slice(0).map(r => r['部署'] || r['dept_name'] || r['name']).filter(Boolean);

  return ok({ date: dateISO, vehicles, dayReservations, deptList });
}

/** API: 指定日の予約 */
function getDay(dateISO) {
  if (!dateISO) return fail('BAD_REQUEST', 'dateISO is required');
  const dayReservations = getDayReservationsJoined_(dateISO);
  return ok({ date: dateISO, dayReservations });
}

/** API: 部署で作業員絞り込み */
function getWorkersByDept(deptName) {
  if (!deptName) return fail('BAD_REQUEST', 'deptName is required');
  const workers = readAllObjects_(CONFIG.SHEETS.WORKER);

  // 列名ゆらぎ吸収（テンプレに合わせて必要に応じて調整）
  const out = workers
    .filter(w => String(w['部署'] || w['dept'] || w['dept_name']) === String(deptName))
    .map(w => ({
      worker_code: w['作業員コード'] || w['worker_code'] || '',
      worker_name: w['氏名'] || w['name'] || '',
      dept_name: deptName,
      role: w['担当業務'] || w['role'] || '',
    }))
    .filter(w => w.worker_code && w.worker_name);

  return ok({ deptName, workers: out });
}

/** API: 予約作成（排他＋競合チェック） */
function createReservation(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return createReservationCore_(payload);
  } finally {
    lock.releaseLock();
  }
}

/** API: 予約取消（排他） */
function cancelReservation(reservationId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return cancelReservationCore_(reservationId);
  } finally {
    lock.releaseLock();
  }
}

/** API: マスタ同期（排他） */
function syncMasters() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return syncMastersCore_();
  } finally {
    lock.releaseLock();
  }
}

/** API: キュー処理（排他） */
function processQueue(batchSize) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return processQueueCore_(batchSize);
  } finally {
    lock.releaseLock();
  }
}
```

---

## Ui.html（最低限の動作確認用）

```html
<!-- Ui.html -->
<!doctype html>
<html>
  <head>
    <base target="_top">
    <style>
      body{font-family:system-ui,-apple-system,"Noto Sans JP",sans-serif;padding:16px;}
      pre{background:#f5f6f8;padding:12px;border-radius:12px;}
      button{padding:10px 14px;border-radius:999px;border:1px solid #ddd;background:#fff;font-weight:700;}
    </style>
  </head>
  <body>
    <h2>車両予約（開発中）</h2>
    <button onclick="load()">getInit()</button>
    <button onclick="sync()">syncMasters()</button>
    <button onclick="queue()">processQueue()</button>
    <pre id="out">ready</pre>

    <script>
      function load(){
        google.script.run.withSuccessHandler(r=>{
          document.getElementById('out').textContent = JSON.stringify(r,null,2);
        }).getInit();
      }
      function sync(){
        google.script.run.withSuccessHandler(r=>{
          document.getElementById('out').textContent = JSON.stringify(r,null,2);
        }).syncMasters();
      }
      function queue(){
        google.script.run.withSuccessHandler(r=>{
          document.getElementById('out').textContent = JSON.stringify(r,null,2);
        }).processQueue(10);
      }
    </script>
  </body>
</html>
```

---

## まずの到達点（これが動けばOK）

1. `getInit()` が vehicles / deptList / dayReservations を返す
2. `getWorkersByDept("機械設計")` が作業員を返す
3. `createReservation()` が reservation_id を返す
4. 同じ枠に再度入れると CONFLICT が返る
5. `cancelReservation()` で status=cancelled になる
6. `syncMasters()` が DeptMaster/WorkerMaster を全件置換する
7. `processQueue()` が pending を処理して done/conflict/error に更新する
