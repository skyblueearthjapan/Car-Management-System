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
