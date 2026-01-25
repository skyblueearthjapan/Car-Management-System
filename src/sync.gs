/**
 * 車両管理予約システム - マスタ同期処理
 * sync.gs
 *
 * 外部スプレッドシートからマスタデータを同期
 */

// ===========================================
// マスタ同期メイン処理
// ===========================================

/**
 * マスタデータを同期（トリガーから呼び出される）
 */
function syncMasters() {
  const runId = generateSyncId();
  const startTime = new Date();

  console.log(`マスタ同期開始: ${runId}`);

  let deptResult = { status: 'skipped', count: 0, errors: [] };
  let workerResult = { status: 'skipped', count: 0, errors: [] };

  try {
    // 同期元スプレッドシートIDを取得
    const sourceId = getSyncSourceId_();

    if (!sourceId) {
      console.log('同期元スプレッドシートIDが設定されていません');
      logSyncResult_(runId, startTime, 'SKIPPED', '同期元未設定', 0, 0);
      return;
    }

    // 同期元スプレッドシートを開く
    const sourceSpreadsheet = SpreadsheetApp.openById(sourceId);

    // 部署マスタを同期
    deptResult = syncDeptMaster_(sourceSpreadsheet);
    console.log(`部署マスタ同期: ${deptResult.status}, ${deptResult.count}件`);

    // 作業員マスタを同期
    workerResult = syncWorkerMaster_(sourceSpreadsheet);
    console.log(`作業員マスタ同期: ${workerResult.status}, ${workerResult.count}件`);

    // 同期結果をログに記録
    const totalErrors = deptResult.errors.length + workerResult.errors.length;
    const status = totalErrors > 0 ? 'PARTIAL' : 'SUCCESS';
    const errorMessages = [...deptResult.errors, ...workerResult.errors].join('; ');

    logSyncResult_(
      runId,
      startTime,
      status,
      errorMessages || 'OK',
      deptResult.count,
      workerResult.count
    );

    console.log(`マスタ同期完了: ${runId}`);

  } catch (e) {
    console.error(`マスタ同期エラー: ${e.message}`);
    logSyncResult_(runId, startTime, 'ERROR', e.message, 0, 0);
  }
}

/**
 * 手動で同期を実行（テスト用）
 */
function manualSync() {
  console.log('手動同期を実行します...');
  syncMasters();
}

// ===========================================
// 個別マスタ同期
// ===========================================

/**
 * 部署マスタを同期
 * @param {Spreadsheet} sourceSpreadsheet - 同期元スプレッドシート
 * @return {Object} 同期結果
 */
function syncDeptMaster_(sourceSpreadsheet) {
  const result = { status: 'success', count: 0, errors: [] };

  try {
    // 同期元シートを取得
    const sourceSheet = sourceSpreadsheet.getSheetByName(SYNC_SOURCE_SHEET_NAMES.DEPT);
    if (!sourceSheet) {
      result.status = 'skipped';
      result.errors.push('同期元の部署シートが見つかりません');
      return result;
    }

    // 同期元データを取得
    const sourceData = sourceSheet.getDataRange().getValues();
    if (sourceData.length <= 1) {
      result.status = 'skipped';
      result.errors.push('同期元の部署データが空です');
      return result;
    }

    // ヘッダーをスキップしてデータを抽出
    const deptRows = sourceData.slice(1).filter(row => row[0]); // 部署名が空でない行

    // 同期先シートをクリアして再構築
    const targetSheet = getSheet_(SHEET_NAMES.DEPT_MASTER);

    // 既存データを取得（ヘッダーは保持）
    const existingData = targetSheet.getDataRange().getValues();
    const headers = existingData[0];

    // データ行をクリア（ヘッダー以外）
    if (targetSheet.getLastRow() > 1) {
      targetSheet.deleteRows(2, targetSheet.getLastRow() - 1);
    }

    // 新しいデータを追加
    const now = new Date();
    const newRows = deptRows.map((row, index) => {
      return [
        row[0],  // dept_name
        index + 1,  // display_order
        1,  // is_active
        now,  // created_at
        now   // updated_at
      ];
    });

    if (newRows.length > 0) {
      targetSheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    result.count = newRows.length;

  } catch (e) {
    result.status = 'error';
    result.errors.push(`部署同期エラー: ${e.message}`);
  }

  return result;
}

/**
 * 作業員マスタを同期
 * @param {Spreadsheet} sourceSpreadsheet - 同期元スプレッドシート
 * @return {Object} 同期結果
 */
function syncWorkerMaster_(sourceSpreadsheet) {
  const result = { status: 'success', count: 0, errors: [] };

  try {
    // 同期元シートを取得
    const sourceSheet = sourceSpreadsheet.getSheetByName(SYNC_SOURCE_SHEET_NAMES.WORKER);
    if (!sourceSheet) {
      result.status = 'skipped';
      result.errors.push('同期元の作業員シートが見つかりません');
      return result;
    }

    // 同期元データを取得
    const sourceData = sourceSheet.getDataRange().getValues();
    if (sourceData.length <= 1) {
      result.status = 'skipped';
      result.errors.push('同期元の作業員データが空です');
      return result;
    }

    // ヘッダーをスキップしてデータを抽出
    // 想定カラム: 社員コード, 氏名, 部署名, ...
    const workerRows = sourceData.slice(1).filter(row => row[0] && row[1]); // コードと名前が空でない行

    // 同期先シートをクリアして再構築
    const targetSheet = getSheet_(SHEET_NAMES.WORKER_MASTER);

    // 既存データを取得（ヘッダーは保持）
    const existingData = targetSheet.getDataRange().getValues();
    const headers = existingData[0];

    // データ行をクリア（ヘッダー以外）
    if (targetSheet.getLastRow() > 1) {
      targetSheet.deleteRows(2, targetSheet.getLastRow() - 1);
    }

    // 新しいデータを追加
    const now = new Date();
    const newRows = workerRows.map((row, index) => {
      return [
        String(row[0]),  // worker_code
        row[1],  // worker_name
        row[2] || '',  // dept_name
        index + 1,  // display_order
        1,  // is_active
        now,  // created_at
        now   // updated_at
      ];
    });

    if (newRows.length > 0) {
      targetSheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    result.count = newRows.length;

  } catch (e) {
    result.status = 'error';
    result.errors.push(`作業員同期エラー: ${e.message}`);
  }

  return result;
}

// ===========================================
// 同期ログ
// ===========================================

/**
 * 同期結果をログに記録
 */
function logSyncResult_(runId, startTime, status, message, deptCount, workerCount) {
  try {
    const sheet = getSheet_(SHEET_NAMES.SYNC_LOG);
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000); // 秒

    const row = [
      runId,
      startTime,
      endTime,
      status,
      message,
      deptCount,
      workerCount,
      duration,
      ''  // notes
    ];

    sheet.appendRow(row);

  } catch (e) {
    console.error(`同期ログ記録エラー: ${e.message}`);
  }
}

// ===========================================
// 設定取得
// ===========================================

/**
 * 同期元スプレッドシートIDを取得
 * @return {string|null} スプレッドシートID
 */
function getSyncSourceId_() {
  try {
    // まずスクリプトプロパティから取得
    const propId = PropertiesService.getScriptProperties().getProperty('SYNC_SOURCE_ID');
    if (propId) {
      return propId;
    }

    // Settingsシートから取得
    const sheet = getSheet_(SHEET_NAMES.SETTINGS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'master_sync_source_id') {
        return data[i][1];
      }
    }

    // デフォルト値（constants.gsで定義）
    return SYNC_SOURCE_SPREADSHEET_ID || null;

  } catch (e) {
    console.error(`同期元ID取得エラー: ${e.message}`);
    return null;
  }
}

/**
 * 同期元スプレッドシートIDを設定
 * @param {string} spreadsheetId - スプレッドシートID
 */
function setSyncSourceId(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty('SYNC_SOURCE_ID', spreadsheetId);
  console.log('同期元スプレッドシートIDを設定しました: ' + spreadsheetId);
}

// ===========================================
// 同期元シート名定義
// ===========================================
const SYNC_SOURCE_SHEET_NAMES = {
  DEPT: '部署マスタ',      // または実際のシート名
  WORKER: '作業員マスタ'   // または実際のシート名
};

// ===========================================
// ユーティリティ
// ===========================================

/**
 * 同期状態を確認
 */
function checkSyncStatus() {
  try {
    const sheet = getSheet_(SHEET_NAMES.SYNC_LOG);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      console.log('同期履歴がありません');
      return;
    }

    // 最新の同期結果を表示
    const lastRow = data[data.length - 1];
    console.log('最新の同期結果:');
    console.log(`  実行ID: ${lastRow[SYNC_LOG_COLS.RUN_ID]}`);
    console.log(`  開始時刻: ${lastRow[SYNC_LOG_COLS.START_TIME]}`);
    console.log(`  終了時刻: ${lastRow[SYNC_LOG_COLS.END_TIME]}`);
    console.log(`  ステータス: ${lastRow[SYNC_LOG_COLS.STATUS]}`);
    console.log(`  部署件数: ${lastRow[SYNC_LOG_COLS.DEPT_COUNT]}`);
    console.log(`  作業員件数: ${lastRow[SYNC_LOG_COLS.WORKER_COUNT]}`);
    console.log(`  処理時間: ${lastRow[SYNC_LOG_COLS.DURATION]}秒`);

  } catch (e) {
    console.error(`同期状態確認エラー: ${e.message}`);
  }
}

/**
 * 同期履歴を全件表示
 */
function listSyncHistory() {
  try {
    const sheet = getSheet_(SHEET_NAMES.SYNC_LOG);
    const data = sheet.getDataRange().getValues();

    console.log('同期履歴:');
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      console.log(`${row[SYNC_LOG_COLS.RUN_ID]} | ${row[SYNC_LOG_COLS.STATUS]} | 部署:${row[SYNC_LOG_COLS.DEPT_COUNT]}件 作業員:${row[SYNC_LOG_COLS.WORKER_COUNT]}件 | ${row[SYNC_LOG_COLS.DURATION]}秒`);
    }

  } catch (e) {
    console.error(`同期履歴表示エラー: ${e.message}`);
  }
}
