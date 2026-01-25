/**
 * 車両管理予約システム - ユーティリティ関数
 * utils.gs
 */

// ===========================================
// 日付操作
// ===========================================

/**
 * DateオブジェクトをYYYY-MM-DD形式の文字列に変換
 * @param {Date} date - 日付オブジェクト
 * @return {string} YYYY-MM-DD形式の文字列
 */
function formatDateToString(date) {
  if (!date || !(date instanceof Date)) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD形式の文字列をDateオブジェクトに変換
 * @param {string} dateStr - YYYY-MM-DD形式の文字列
 * @return {Date} 日付オブジェクト
 */
function parseStringToDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * 日付に日数を加算
 * @param {Date} date - 基準日
 * @param {number} days - 加算する日数
 * @return {Date} 新しい日付
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 2つの日付間の日数を計算（両端を含む）
 * @param {Date|string} startDate - 開始日
 * @param {Date|string} endDate - 終了日
 * @return {number} 日数
 */
function getDaysBetween(startDate, endDate) {
  const start = typeof startDate === 'string' ? parseStringToDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseStringToDate(endDate) : endDate;

  if (!start || !end) return 0;

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 両端を含む
}

/**
 * 指定日を含む週の日付配列を取得（月曜始まり）
 * @param {Date|string} date - 基準日
 * @return {Date[]} 7日分の日付配列
 */
function getWeekDates(date) {
  const baseDate = typeof date === 'string' ? parseStringToDate(date) : new Date(date);
  const dayOfWeek = baseDate.getDay();

  // 月曜始まりに調整（日曜=0を7として扱う）
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // 週の開始日（月曜）を計算
  const monday = addDays(baseDate, -adjustedDay);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(addDays(monday, i));
  }

  return weekDates;
}

/**
 * 日付の曜日を日本語で取得
 * @param {Date} date - 日付
 * @return {string} 曜日（月, 火, ...）
 */
function getDayOfWeekJa(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

/**
 * 開始日から終了日までの日付配列を生成
 * @param {string} startDateStr - 開始日（YYYY-MM-DD）
 * @param {string} endDateStr - 終了日（YYYY-MM-DD）
 * @return {string[]} 日付文字列の配列
 */
function getDateRange(startDateStr, endDateStr) {
  const dates = [];
  const startDate = parseStringToDate(startDateStr);
  const endDate = parseStringToDate(endDateStr);

  if (!startDate || !endDate) return dates;

  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatDateToString(current));
    current = addDays(current, 1);
  }

  return dates;
}

// ===========================================
// 時刻操作
// ===========================================

/**
 * 時刻文字列をDateオブジェクト（時刻のみ）に変換
 * @param {string} timeStr - HH:MM形式の文字列
 * @return {Date} 時刻を表すDateオブジェクト（1970-01-01ベース）
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const date = new Date(1970, 0, 1);
  date.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
  return date;
}

/**
 * 時刻の重なりをチェック
 * @param {string} start1 - 範囲1の開始時刻（HH:MM）
 * @param {string} end1 - 範囲1の終了時刻（HH:MM）
 * @param {string} start2 - 範囲2の開始時刻（HH:MM）
 * @param {string} end2 - 範囲2の終了時刻（HH:MM）
 * @return {boolean} 重なりがあればtrue
 */
function isTimeOverlap(start1, end1, start2, end2) {
  const s1 = parseTimeString(start1);
  const e1 = parseTimeString(end1);
  const s2 = parseTimeString(start2);
  const e2 = parseTimeString(end2);

  if (!s1 || !e1 || !s2 || !e2) return false;

  // 重なりなし = 一方が他方より完全に前または後
  return !(e1 <= s2 || e2 <= s1);
}

/**
 * スロットの実効時刻を取得
 * @param {string} slot - スロット名（AM/PM/FULL）
 * @param {string} startTime - カスタム開始時刻（任意）
 * @param {string} endTime - カスタム終了時刻（任意）
 * @return {{start: string, end: string}} 実効時刻
 */
function getEffectiveTime(slot, startTime, endTime) {
  const slotDef = SLOTS[slot];
  if (!slotDef) {
    return { start: '08:00', end: '18:00' };
  }

  return {
    start: startTime || slotDef.start,
    end: endTime || slotDef.end
  };
}

// ===========================================
// ID生成
// ===========================================

/**
 * 予約IDを生成
 * 形式: R + YYYYMMDD + - + 連番（3桁）
 * @param {string} dateStr - 日付（YYYY-MM-DD）
 * @return {string} 予約ID
 */
function generateReservationId(dateStr) {
  const dateForId = dateStr.replace(/-/g, '');
  const prefix = RESERVATION_ID_PREFIX + dateForId + '-';

  // 既存の予約から最大連番を取得
  const sheet = getSheet_(SHEET_NAMES.RESERVATIONS);
  const data = sheet.getDataRange().getValues();

  let maxSeq = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][RESERVATION_COLS.RESERVATION_ID];
    if (id && id.startsWith(prefix)) {
      const seq = parseInt(id.substring(prefix.length));
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const newSeq = String(maxSeq + 1).padStart(3, '0');
  return prefix + newSeq;
}

/**
 * 同期実行IDを生成
 * 形式: SYNC- + 連番（4桁）
 * @return {string} 同期ID
 */
function generateSyncId() {
  const sheet = getSheet_(SHEET_NAMES.SYNC_LOG);
  const data = sheet.getDataRange().getValues();

  let maxSeq = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][SYNC_LOG_COLS.RUN_ID];
    if (id && id.startsWith(SYNC_ID_PREFIX)) {
      const seq = parseInt(id.substring(SYNC_ID_PREFIX.length));
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const newSeq = String(maxSeq + 1).padStart(4, '0');
  return SYNC_ID_PREFIX + newSeq;
}

// ===========================================
// シート操作ヘルパー
// ===========================================

/**
 * DBスプレッドシートを取得
 * @return {Spreadsheet} スプレッドシート
 */
function getDbSpreadsheet_() {
  if (DB_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  }
  // IDが設定されていない場合はアクティブなスプレッドシートを使用
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 指定名のシートを取得
 * @param {string} sheetName - シート名
 * @return {Sheet} シート
 */
function getSheet_(sheetName) {
  const ss = getDbSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`シート "${sheetName}" が見つかりません`);
  }
  return sheet;
}

/**
 * シートのデータを2次元配列として取得（ヘッダ行除く）
 * @param {string} sheetName - シート名
 * @return {Array[]} データ配列
 */
function getSheetData_(sheetName) {
  const sheet = getSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  return data.slice(HEADER_ROWS); // ヘッダ行をスキップ
}

// ===========================================
// バリデーション
// ===========================================

/**
 * 必須フィールドのチェック
 * @param {Object} obj - チェック対象オブジェクト
 * @param {string[]} requiredFields - 必須フィールド名の配列
 * @return {{valid: boolean, missing: string[]}} 結果
 */
function validateRequired(obj, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

/**
 * 日付形式のバリデーション
 * @param {string} dateStr - 日付文字列
 * @return {boolean} 有効ならtrue
 */
function isValidDateFormat(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = parseStringToDate(dateStr);
  return date !== null && !isNaN(date.getTime());
}

/**
 * スロットのバリデーション
 * @param {string} slot - スロット名
 * @return {boolean} 有効ならtrue
 */
function isValidSlot(slot) {
  return slot && SLOTS.hasOwnProperty(slot);
}

// ===========================================
// ユーザー情報
// ===========================================

/**
 * 現在のユーザーのメールアドレスを取得
 * @return {string} メールアドレス
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

// ===========================================
// レスポンス生成
// ===========================================

/**
 * 成功レスポンスを生成
 * @param {*} data - レスポンスデータ
 * @return {Object} レスポンスオブジェクト
 */
function successResponse(data) {
  return {
    code: ERROR_CODES.SUCCESS,
    data: data
  };
}

/**
 * エラーレスポンスを生成
 * @param {string} code - エラーコード
 * @param {string} message - エラーメッセージ
 * @param {*} details - 詳細情報（任意）
 * @return {Object} レスポンスオブジェクト
 */
function errorResponse(code, message, details) {
  return {
    code: code,
    message: message,
    details: details || null
  };
}
