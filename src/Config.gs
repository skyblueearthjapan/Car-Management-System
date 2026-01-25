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
