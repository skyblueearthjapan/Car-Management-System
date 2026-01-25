/**
 * 車両管理予約システム - メインエントリポイント
 * Code.gs
 */

/**
 * WebアプリのGETリクエストハンドラ
 * @param {Object} e - イベントオブジェクト
 * @return {HtmlOutput} HTMLページ
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');

  return template.evaluate()
    .setTitle('車両管理予約システム')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * HTMLファイルをインクルードする
 * @param {string} filename - ファイル名（拡張子なし）
 * @return {string} HTMLコンテンツ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * デプロイURL取得（デバッグ用）
 * @return {string} URL
 */
function getDeployedUrl() {
  return ScriptApp.getService().getUrl();
}

// ===========================================
// セットアップ関数
// ===========================================

/**
 * スクリプトプロパティにDBスプレッドシートIDを設定
 * ※初回セットアップ時に手動実行
 * @param {string} spreadsheetId - スプレッドシートID
 */
function setDbSpreadsheetId(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty('DB_SPREADSHEET_ID', spreadsheetId);
  console.log('DB_SPREADSHEET_ID を設定しました: ' + spreadsheetId);
}

/**
 * 現在の設定を確認
 */
function checkSetup() {
  const props = PropertiesService.getScriptProperties().getProperties();
  console.log('スクリプトプロパティ:');
  console.log(JSON.stringify(props, null, 2));

  // DBスプレッドシートの接続確認
  try {
    const ss = getDbSpreadsheet_();
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
