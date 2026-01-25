/** Code.gs */

function doGet() {
  // UIは後で実装。まずは最低限。
  const t = HtmlService.createTemplateFromFile('Ui');
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
    .filter(w => {
      const wDept = String(w['部署'] || w['dept'] || w['dept_name'] || '');
      return wDept === String(deptName);
    })
    .filter(w => {
      // is_active チェック (1, '1', true, 'TRUE' を許容)
      const active = w['is_active'];
      if (active === undefined || active === '') return true; // 列が無い場合はOK
      return active === 1 || active === '1' || active === true || String(active).toUpperCase() === 'TRUE';
    })
    .map(w => ({
      worker_code: w['作業員コード'] || w['worker_code'] || '',
      worker_name: w['氏名'] || w['worker_name'] || w['name'] || '',
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

// ===========================================
// セットアップ関数
// ===========================================

/**
 * 現在の設定を確認
 */
function checkSetup() {
  console.log('CONFIG.DB_SPREADSHEET_ID: ' + CONFIG.DB_SPREADSHEET_ID);

  // DBスプレッドシートの接続確認
  try {
    const ss = db_();
    console.log('DBスプレッドシート接続OK: ' + ss.getName());

    // シート一覧
    const sheets = ss.getSheets().map(s => s.getName());
    console.log('シート一覧: ' + sheets.join(', '));

  } catch (e) {
    console.log('DBスプレッドシート接続エラー: ' + e.message);
  }
}

// ===========================================
// トリガー設定
// ===========================================

/**
 * マスタ同期の時間主導トリガーを設定
 * ※初回セットアップ時に手動実行
 */
function setupSyncTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'syncMasters') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // 毎日午前6時に実行するトリガーを作成
  ScriptApp.newTrigger('syncMasters')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  console.log('マスタ同期トリガーを設定しました（毎日 06:00）');
}

/**
 * トリガー一覧を表示
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  console.log('設定済みトリガー:');
  for (const trigger of triggers) {
    console.log(`- ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);
  }
}
