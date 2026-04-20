/** Code.gs */

/** 社内ポータルサイトURL（全画面共通） */
var PORTAL_URL = 'https://script.google.com/a/macros/lineworks-local.info/s/AKfycbx2eyJMOYP9o--GPBuhY-pj071IIR6Kqb_0xALwwNzdLQZux0dIAlL3P9EoCucnzXA/exec';

function doGet() {
  const t = HtmlService.createTemplateFromFile('Ui');
  t.PORTAL_URL = PORTAL_URL;
  return t.evaluate()
    .setTitle('車両予約')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** API: 初期データ */
function getInit(dateISO) {
  try {
    dateISO = dateISO || toISODate_(new Date());
    const vehicles = getActiveVehicles_();
    const dayReservations = getDayReservationsJoined_(dateISO);

    // DeptMaster はヘッダーなしなので専用関数を使う
    const deptRows = readDeptMaster_();
    const deptList = deptRows
      .filter(r => {
        // is_active チェック (1, '1', true, 'TRUE' を許容)
        const active = r.is_active;
        if (active === undefined || active === '') return true;
        return active === 1 || active === '1' || active === true || String(active).toUpperCase() === 'TRUE';
      })
      .map(r => r.dept_name)
      .filter(Boolean);

    // JSON.parse/stringifyで確実にシリアライズ可能にする（Date型などを文字列化）
    const result = { date: dateISO, vehicles, dayReservations, deptList };
    return ok(JSON.parse(JSON.stringify(result)));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** API: 指定日の予約 */
function getDay(dateISO) {
  try {
    if (!dateISO) return fail('BAD_REQUEST', 'dateISO is required');
    const dayReservations = getDayReservationsJoined_(dateISO);
    // JSON.parse/stringifyで確実にシリアライズ可能にする
    const result = { date: dateISO, dayReservations };
    return ok(JSON.parse(JSON.stringify(result)));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** API: 部署で作業員絞り込み */
function getWorkersByDept(deptName) {
  if (!deptName) return fail('BAD_REQUEST', 'deptName is required');

  // WorkerMaster はヘッダーなしなので専用関数を使う
  const workers = readWorkerMaster_();

  const out = workers
    .filter(w => String(w.dept_name) === String(deptName))
    .map(w => ({
      worker_code: w.worker_code,
      worker_name: w.worker_name,
      dept_name: w.dept_name,
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

// ===========================================
// セットアップ・デバッグ関数
// ===========================================

/**
 * 現在の設定を確認
 */
function checkSetup() {
  console.log('CONFIG.DB_SPREADSHEET_ID: ' + CONFIG.DB_SPREADSHEET_ID);

  try {
    const ss = db_();
    console.log('DBスプレッドシート接続OK: ' + ss.getName());
    const sheets = ss.getSheets().map(s => s.getName());
    console.log('シート一覧: ' + sheets.join(', '));
  } catch (e) {
    console.log('DBスプレッドシート接続エラー: ' + e.message);
  }
}

/**
 * getInit のテスト
 */
function testGetInit() {
  const result = getInit();
  console.log(JSON.stringify(result, null, 2));
}

/**
 * 車両データのテスト
 */
function testVehicles() {
  const vehicles = getActiveVehicles_();
  console.log('車両数: ' + vehicles.length);
  console.log(JSON.stringify(vehicles, null, 2));
}

/**
 * 部署データのテスト
 */
function testDepts() {
  const depts = readDeptMaster_();
  console.log('部署数: ' + depts.length);
  console.log(JSON.stringify(depts, null, 2));
}

/**
 * 作業員データのテスト
 */
function testWorkers() {
  const workers = readWorkerMaster_();
  console.log('作業員数: ' + workers.length);
  console.log(JSON.stringify(workers.slice(0, 5), null, 2));
}

// ===========================================
// トリガー設定
// ===========================================

function setupSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'syncMasters') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('syncMasters')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  console.log('マスタ同期トリガーを設定しました（毎日 06:00）');
}

function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  console.log('設定済みトリガー:');
  for (const trigger of triggers) {
    console.log(`- ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);
  }
}
