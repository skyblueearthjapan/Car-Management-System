/**
 * 車両管理予約システム - 定数定義
 * constants.gs
 */

// ===========================================
// スプレッドシート設定
// ===========================================

/**
 * DBスプレッドシートID
 * ※実際のスプレッドシートIDに置き換えてください
 */
const DB_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('DB_SPREADSHEET_ID') || '';

/**
 * マスタ同期元スプレッドシートID
 */
const SYNC_SOURCE_SPREADSHEET_ID = '1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ';

// ===========================================
// シート名
// ===========================================

const SHEET_NAMES = {
  VEHICLES: 'Vehicles',
  RESERVATIONS: 'Reservations',
  RESERVATION_DAYS: 'ReservationDays',
  DEPT_MASTER: 'DeptMaster',
  WORKER_MASTER: 'WorkerMaster',
  SYNC_LOG: 'SyncLog',
  INTEGRATION_QUEUE: 'IntegrationQueue',
  SETTINGS: 'Settings',
  LISTS: 'Lists'
};

/**
 * 同期元シート名
 */
const SYNC_SOURCE_SHEETS = {
  DEPT: '部署マスタ',
  WORKER: '作業員マスタ'
};

// ===========================================
// 列インデックス（0始まり）
// ===========================================

/**
 * Vehicles列インデックス
 */
const VEHICLE_COLS = {
  VEHICLE_ID: 0,
  NAME: 1,
  CATEGORY: 2,
  DISPLAY_ORDER: 3,
  PLATE_NO: 4,
  UI_STYLE: 5,
  IMAGE_DRIVE_FILE_ID: 6,
  ACTIVE: 7,
  TAGS: 8,
  NOTES: 9
};

/**
 * Reservations列インデックス
 */
const RESERVATION_COLS = {
  RESERVATION_ID: 0,
  VEHICLE_ID: 1,
  START_DATE: 2,
  END_DATE: 3,
  DEPT_NAME: 4,
  WORKER_CODE: 5,
  WORKER_NAME: 6,
  PURPOSE: 7,
  DESTINATION: 8,
  MEMO: 9,
  STATUS: 10,
  PERIOD_DAYS: 11,
  CREATED_AT: 12,
  CREATED_BY: 13,
  UPDATED_AT: 14,
  UPDATED_BY: 15,
  SOURCE_SYSTEM: 16,
  SOURCE_ID: 17,
  SOURCE_URL: 18,
  SOURCE_LAST_SYNC_AT: 19,
  DISPLAY_LABEL: 20
};

/**
 * ReservationDays列インデックス
 */
const RESERVATION_DAY_COLS = {
  RESERVATION_ID: 0,
  VEHICLE_ID: 1,
  DATE: 2,
  SLOT: 3,
  START_TIME: 4,
  END_TIME: 5,
  EFFECTIVE_START: 6,
  EFFECTIVE_END: 7,
  CONFLICT_KEY: 8,
  CREATED_AT: 9,
  UPDATED_AT: 10,
  NOTES: 11
};

/**
 * DeptMaster列インデックス
 */
const DEPT_COLS = {
  DEPT_NAME: 0,
  ACTIVE: 1,
  DISPLAY_ORDER: 2,
  NOTES: 3,
  SYNCED_AT: 4
};

/**
 * WorkerMaster列インデックス
 */
const WORKER_COLS = {
  WORKER_CODE: 0,
  WORKER_NAME: 1,
  DEPT_NAME: 2,
  JOB: 3,
  ACTIVE: 4,
  SYNCED_AT: 5,
  NOTES: 6
};

/**
 * SyncLog列インデックス
 */
const SYNC_LOG_COLS = {
  RUN_ID: 0,
  RUN_AT: 1,
  STATUS: 2,
  DEPT_ROWS: 3,
  WORKER_ROWS: 4,
  DURATION_MS: 5,
  ERROR_MESSAGE: 6,
  TRIGGERED_BY: 7,
  SOURCE_SPREADSHEET_ID: 8
};

// ===========================================
// スロット定義
// ===========================================

const SLOTS = {
  AM: {
    name: 'AM',
    label: '午前',
    start: '08:00',
    end: '13:00'
  },
  PM: {
    name: 'PM',
    label: '午後',
    start: '13:00',
    end: '18:00'
  },
  FULL: {
    name: 'FULL',
    label: '終日',
    start: '08:00',
    end: '18:00'
  }
};

// ===========================================
// ステータス値
// ===========================================

const RESERVATION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled'
};

const SYNC_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure'
};

const QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILURE: 'failure'
};

// ===========================================
// カテゴリ
// ===========================================

const VEHICLE_CATEGORY = {
  OWNED: 'owned',
  BORROWABLE: 'borrowable'
};

// ===========================================
// エラーコード
// ===========================================

const ERROR_CODES = {
  SUCCESS: 'SUCCESS',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// ===========================================
// その他設定
// ===========================================

/**
 * 予約IDプレフィックス
 */
const RESERVATION_ID_PREFIX = 'R';

/**
 * 同期IDプレフィックス
 */
const SYNC_ID_PREFIX = 'SYNC-';

/**
 * 週の開始曜日（0=日曜, 1=月曜）
 */
const WEEK_START_DAY = 1; // 月曜始まり

/**
 * ヘッダ行数（データは2行目から）
 */
const HEADER_ROWS = 1;

/**
 * ソースシステム（このアプリ）
 */
const SOURCE_SYSTEM_WEBAPP = 'webapp';
