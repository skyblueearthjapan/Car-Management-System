/** Db.gs */
function db_() {
  return SpreadsheetApp.openById(CONFIG.DB_SPREADSHEET_ID);
}

function sh_(name) {
  const sheet = db_().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet not found: ${name}`);
  return sheet;
}

/**
 * ヘッダー行を探す（vehicle_id, reservation_id などを含む行）
 * 説明文ではなく、実際のカラム名が並んでいる行を検出
 * 見つからなければ1を返す
 */
function findHeaderRow_(sheet) {
  const maxSearch = 10;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return 1;

  for (let row = 1; row <= maxSearch; row++) {
    const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

    // 複数のセルに値があるかチェック（説明文は1セルだけに長い文章が入る）
    const nonEmptyCells = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (nonEmptyCells.length < 3) continue;

    // 各セルの値が短い（カラム名は通常30文字以内）
    const shortValues = nonEmptyCells.filter(v => String(v).length <= 30);
    if (shortValues.length < 3) continue;

    // 既知のヘッダーキーワードを含むセルがあるか（完全一致）
    const hasHeaderKeyword = values.some(v => {
      const s = String(v).toLowerCase().trim();
      return s === 'vehicle_id' || s === 'reservation_id' ||
             s === 'dept_name' || s === 'worker_code' ||
             s === 'queue_id' || s === 'sync_id' ||
             s === 'date' || s === 'slot' || s === 'status';
    });

    if (hasHeaderKeyword) {
      return row;
    }
  }
  return 1;
}

function headerMap_(sheet, headerRow) {
  headerRow = headerRow || findHeaderRow_(sheet);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  const values = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
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
  if (lastCol === 0 || lastRow === 0) return [];

  const headerRow = findHeaderRow_(sheet);
  if (lastRow <= headerRow) return [];

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(String);
  const data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();

  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h && h.trim()) obj[h.trim()] = row[i];
    });
    return obj;
  }).filter(obj => Object.keys(obj).length > 0);
}

/**
 * ヘッダーなしシート用（DeptMaster, WorkerMaster）
 * 固定列位置で読み込む
 */
function readDeptMaster_() {
  const sheet = sh_(CONFIG.SHEETS.DEPT);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // 1行目はタイトル、2行目からデータ
  // A=dept_name, B=display_order, C=is_active, D=created_at, E=updated_at
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  return data
    .filter(row => row[0]) // dept_name が空でない
    .map(row => ({
      dept_name: String(row[0] || ''),
      display_order: row[1],
      is_active: row[2],
      created_at: row[3],
      updated_at: row[4],
    }));
}

function readWorkerMaster_() {
  const sheet = sh_(CONFIG.SHEETS.WORKER);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // 1行目はタイトル、2行目からデータ
  // A=worker_code, B=worker_name, C=dept_name, D=display_order, E=is_active, F=created_at, G=updated_at
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  return data
    .filter(row => row[0]) // worker_code が空でない
    .map(row => ({
      worker_code: String(row[0] || ''),
      worker_name: String(row[1] || ''),
      dept_name: String(row[2] || ''),
      display_order: row[3],
      is_active: row[4],
      created_at: row[5],
      updated_at: row[6],
    }));
}

function appendObject_(sheetName, obj) {
  const sheet = sh_(sheetName);
  const headerRow = findHeaderRow_(sheet);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(String);
  const row = headers.map(key => (obj[key.trim()] !== undefined ? obj[key.trim()] : ''));
  sheet.appendRow(row);
}

function updateRowsByKey_(sheetName, keyField, keyValue, patchObj) {
  const sheet = sh_(sheetName);
  const headerRow = findHeaderRow_(sheet);
  const h = headerMap_(sheet, headerRow);
  if (!h[keyField]) throw new Error(`Key field not found: ${sheetName}.${keyField}`);

  const lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return 0;

  const keyCol = h[keyField];
  const dataStartRow = headerRow + 1;
  const range = sheet.getRange(dataStartRow, keyCol, lastRow - headerRow, 1).getValues();
  const hitRows = [];
  range.forEach((v, i) => {
    if (String(v[0]) === String(keyValue)) hitRows.push(dataStartRow + i);
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
