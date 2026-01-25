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
