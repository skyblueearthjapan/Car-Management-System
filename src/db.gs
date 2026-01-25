/**
 * 車両管理予約システム - DB操作
 * db.gs
 */

// ===========================================
// 車両 (Vehicles)
// ===========================================

/**
 * 全車両を取得（activeのみ）
 * @return {Object[]} 車両オブジェクトの配列
 */
function getVehicles() {
  const data = getSheetData_(SHEET_NAMES.VEHICLES);
  const vehicles = [];

  for (const row of data) {
    // activeがTRUEのもののみ
    if (row[VEHICLE_COLS.ACTIVE] === true || row[VEHICLE_COLS.ACTIVE] === 'TRUE') {
      vehicles.push({
        vehicle_id: row[VEHICLE_COLS.VEHICLE_ID],
        name: row[VEHICLE_COLS.NAME],
        category: row[VEHICLE_COLS.CATEGORY],
        display_order: row[VEHICLE_COLS.DISPLAY_ORDER],
        plate_no: row[VEHICLE_COLS.PLATE_NO] || '',
        ui_style: row[VEHICLE_COLS.UI_STYLE] || '',
        image_drive_file_id: row[VEHICLE_COLS.IMAGE_DRIVE_FILE_ID] || ''
      });
    }
  }

  // カテゴリ別、表示順でソート
  vehicles.sort((a, b) => {
    if (a.category !== b.category) {
      // ownedを先に
      return a.category === VEHICLE_CATEGORY.OWNED ? -1 : 1;
    }
    return a.display_order - b.display_order;
  });

  return vehicles;
}

/**
 * 車両IDで車両を取得
 * @param {string} vehicleId - 車両ID
 * @return {Object|null} 車両オブジェクト
 */
function getVehicleById(vehicleId) {
  const data = getSheetData_(SHEET_NAMES.VEHICLES);

  for (const row of data) {
    if (row[VEHICLE_COLS.VEHICLE_ID] === vehicleId) {
      return {
        vehicle_id: row[VEHICLE_COLS.VEHICLE_ID],
        name: row[VEHICLE_COLS.NAME],
        category: row[VEHICLE_COLS.CATEGORY],
        display_order: row[VEHICLE_COLS.DISPLAY_ORDER],
        plate_no: row[VEHICLE_COLS.PLATE_NO] || '',
        ui_style: row[VEHICLE_COLS.UI_STYLE] || '',
        active: row[VEHICLE_COLS.ACTIVE]
      };
    }
  }

  return null;
}

// ===========================================
// 予約 (Reservations)
// ===========================================

/**
 * 指定日の予約を取得
 * @param {string} dateStr - 日付（YYYY-MM-DD）
 * @return {Object[]} 予約オブジェクトの配列
 */
function getReservationsByDate(dateStr) {
  const daysData = getSheetData_(SHEET_NAMES.RESERVATION_DAYS);
  const reservationsData = getSheetData_(SHEET_NAMES.RESERVATIONS);

  // 該当日のReservationDaysを取得
  const matchingDays = [];
  for (const row of daysData) {
    const rowDate = row[RESERVATION_DAY_COLS.DATE];
    const dateValue = rowDate instanceof Date
      ? formatDateToString(rowDate)
      : String(rowDate);

    if (dateValue === dateStr) {
      matchingDays.push({
        reservation_id: row[RESERVATION_DAY_COLS.RESERVATION_ID],
        vehicle_id: row[RESERVATION_DAY_COLS.VEHICLE_ID],
        date: dateValue,
        slot: row[RESERVATION_DAY_COLS.SLOT],
        start_time: row[RESERVATION_DAY_COLS.START_TIME] || '',
        end_time: row[RESERVATION_DAY_COLS.END_TIME] || '',
        effective_start: row[RESERVATION_DAY_COLS.EFFECTIVE_START] || '',
        effective_end: row[RESERVATION_DAY_COLS.EFFECTIVE_END] || ''
      });
    }
  }

  // 予約IDでReservationsを取得してマージ
  const reservationIds = [...new Set(matchingDays.map(d => d.reservation_id))];
  const reservationsMap = {};

  for (const row of reservationsData) {
    const resId = row[RESERVATION_COLS.RESERVATION_ID];
    if (reservationIds.includes(resId) && row[RESERVATION_COLS.STATUS] === RESERVATION_STATUS.ACTIVE) {
      reservationsMap[resId] = {
        reservation_id: resId,
        vehicle_id: row[RESERVATION_COLS.VEHICLE_ID],
        start_date: formatDateIfDate_(row[RESERVATION_COLS.START_DATE]),
        end_date: formatDateIfDate_(row[RESERVATION_COLS.END_DATE]),
        dept_name: row[RESERVATION_COLS.DEPT_NAME],
        worker_code: row[RESERVATION_COLS.WORKER_CODE],
        worker_name: row[RESERVATION_COLS.WORKER_NAME],
        purpose: row[RESERVATION_COLS.PURPOSE] || '',
        destination: row[RESERVATION_COLS.DESTINATION] || '',
        memo: row[RESERVATION_COLS.MEMO] || '',
        status: row[RESERVATION_COLS.STATUS],
        display_label: row[RESERVATION_COLS.DISPLAY_LABEL] || ''
      };
    }
  }

  // 結果をマージ
  const result = [];
  for (const day of matchingDays) {
    const reservation = reservationsMap[day.reservation_id];
    if (reservation) {
      result.push({
        ...reservation,
        slot: day.slot,
        start_time: day.start_time,
        end_time: day.end_time,
        effective_start: day.effective_start,
        effective_end: day.effective_end
      });
    }
  }

  return result;
}

/**
 * 予約IDで予約を取得
 * @param {string} reservationId - 予約ID
 * @return {Object|null} 予約オブジェクト
 */
function getReservationById(reservationId) {
  const data = getSheetData_(SHEET_NAMES.RESERVATIONS);

  for (const row of data) {
    if (row[RESERVATION_COLS.RESERVATION_ID] === reservationId) {
      return {
        reservation_id: row[RESERVATION_COLS.RESERVATION_ID],
        vehicle_id: row[RESERVATION_COLS.VEHICLE_ID],
        start_date: formatDateIfDate_(row[RESERVATION_COLS.START_DATE]),
        end_date: formatDateIfDate_(row[RESERVATION_COLS.END_DATE]),
        dept_name: row[RESERVATION_COLS.DEPT_NAME],
        worker_code: row[RESERVATION_COLS.WORKER_CODE],
        worker_name: row[RESERVATION_COLS.WORKER_NAME],
        purpose: row[RESERVATION_COLS.PURPOSE] || '',
        destination: row[RESERVATION_COLS.DESTINATION] || '',
        memo: row[RESERVATION_COLS.MEMO] || '',
        status: row[RESERVATION_COLS.STATUS],
        created_at: row[RESERVATION_COLS.CREATED_AT],
        created_by: row[RESERVATION_COLS.CREATED_BY]
      };
    }
  }

  return null;
}

/**
 * 予約を作成
 * @param {Object} reservation - 予約データ
 * @return {string} 作成された予約ID
 */
function insertReservation(reservation) {
  const sheet = getSheet_(SHEET_NAMES.RESERVATIONS);
  const now = new Date();
  const userEmail = getCurrentUserEmail();

  const reservationId = generateReservationId(reservation.start_date);
  const periodDays = getDaysBetween(reservation.start_date, reservation.end_date);
  const displayLabel = `${reservation.dept_name} ${reservation.worker_name}`;

  const row = [];
  row[RESERVATION_COLS.RESERVATION_ID] = reservationId;
  row[RESERVATION_COLS.VEHICLE_ID] = reservation.vehicle_id;
  row[RESERVATION_COLS.START_DATE] = reservation.start_date;
  row[RESERVATION_COLS.END_DATE] = reservation.end_date;
  row[RESERVATION_COLS.DEPT_NAME] = reservation.dept_name;
  row[RESERVATION_COLS.WORKER_CODE] = reservation.worker_code;
  row[RESERVATION_COLS.WORKER_NAME] = reservation.worker_name;
  row[RESERVATION_COLS.PURPOSE] = reservation.purpose || '';
  row[RESERVATION_COLS.DESTINATION] = reservation.destination || '';
  row[RESERVATION_COLS.MEMO] = reservation.memo || '';
  row[RESERVATION_COLS.STATUS] = RESERVATION_STATUS.ACTIVE;
  row[RESERVATION_COLS.PERIOD_DAYS] = periodDays;
  row[RESERVATION_COLS.CREATED_AT] = now;
  row[RESERVATION_COLS.CREATED_BY] = userEmail;
  row[RESERVATION_COLS.UPDATED_AT] = now;
  row[RESERVATION_COLS.UPDATED_BY] = userEmail;
  row[RESERVATION_COLS.SOURCE_SYSTEM] = SOURCE_SYSTEM_WEBAPP;
  row[RESERVATION_COLS.SOURCE_ID] = '';
  row[RESERVATION_COLS.SOURCE_URL] = '';
  row[RESERVATION_COLS.SOURCE_LAST_SYNC_AT] = '';
  row[RESERVATION_COLS.DISPLAY_LABEL] = displayLabel;

  sheet.appendRow(row);

  return reservationId;
}

/**
 * 予約日別明細を作成
 * @param {string} reservationId - 予約ID
 * @param {string} vehicleId - 車両ID
 * @param {string[]} dates - 日付配列
 * @param {string} slot - スロット
 * @param {string} startTime - 開始時刻（任意）
 * @param {string} endTime - 終了時刻（任意）
 */
function insertReservationDays(reservationId, vehicleId, dates, slot, startTime, endTime) {
  const sheet = getSheet_(SHEET_NAMES.RESERVATION_DAYS);
  const now = new Date();
  const effectiveTime = getEffectiveTime(slot, startTime, endTime);

  const rows = [];
  for (const dateStr of dates) {
    const row = [];
    row[RESERVATION_DAY_COLS.RESERVATION_ID] = reservationId;
    row[RESERVATION_DAY_COLS.VEHICLE_ID] = vehicleId;
    row[RESERVATION_DAY_COLS.DATE] = dateStr;
    row[RESERVATION_DAY_COLS.SLOT] = slot;
    row[RESERVATION_DAY_COLS.START_TIME] = startTime || '';
    row[RESERVATION_DAY_COLS.END_TIME] = endTime || '';
    row[RESERVATION_DAY_COLS.EFFECTIVE_START] = effectiveTime.start;
    row[RESERVATION_DAY_COLS.EFFECTIVE_END] = effectiveTime.end;
    row[RESERVATION_DAY_COLS.CONFLICT_KEY] = `${vehicleId}|${dateStr}`;
    row[RESERVATION_DAY_COLS.CREATED_AT] = now;
    row[RESERVATION_DAY_COLS.UPDATED_AT] = now;
    row[RESERVATION_DAY_COLS.NOTES] = '';

    rows.push(row);
  }

  // 一括追加
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * 予約をキャンセル
 * @param {string} reservationId - 予約ID
 * @return {boolean} 成功したかどうか
 */
function cancelReservation(reservationId) {
  const sheet = getSheet_(SHEET_NAMES.RESERVATIONS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][RESERVATION_COLS.RESERVATION_ID] === reservationId) {
      const now = new Date();
      const userEmail = getCurrentUserEmail();

      // ステータスをcancelledに更新
      sheet.getRange(i + 1, RESERVATION_COLS.STATUS + 1).setValue(RESERVATION_STATUS.CANCELLED);
      sheet.getRange(i + 1, RESERVATION_COLS.UPDATED_AT + 1).setValue(now);
      sheet.getRange(i + 1, RESERVATION_COLS.UPDATED_BY + 1).setValue(userEmail);

      return true;
    }
  }

  return false;
}

// ===========================================
// 競合チェック
// ===========================================

/**
 * 競合をチェック
 * @param {string} vehicleId - 車両ID
 * @param {string[]} dates - 日付配列
 * @param {string} slot - スロット
 * @param {string} startTime - 開始時刻（任意）
 * @param {string} endTime - 終了時刻（任意）
 * @param {string} excludeReservationId - 除外する予約ID（更新時）
 * @return {Object[]} 競合情報の配列（空なら競合なし）
 */
function checkConflict(vehicleId, dates, slot, startTime, endTime, excludeReservationId) {
  const daysData = getSheetData_(SHEET_NAMES.RESERVATION_DAYS);
  const reservationsData = getSheetData_(SHEET_NAMES.RESERVATIONS);

  // アクティブな予約のIDセットを作成
  const activeReservationIds = new Set();
  for (const row of reservationsData) {
    if (row[RESERVATION_COLS.STATUS] === RESERVATION_STATUS.ACTIVE) {
      activeReservationIds.add(row[RESERVATION_COLS.RESERVATION_ID]);
    }
  }

  const newEffective = getEffectiveTime(slot, startTime, endTime);
  const conflicts = [];

  for (const row of daysData) {
    const existingResId = row[RESERVATION_DAY_COLS.RESERVATION_ID];

    // 除外する予約IDはスキップ
    if (excludeReservationId && existingResId === excludeReservationId) {
      continue;
    }

    // アクティブでない予約はスキップ
    if (!activeReservationIds.has(existingResId)) {
      continue;
    }

    // 車両IDが一致するかチェック
    if (row[RESERVATION_DAY_COLS.VEHICLE_ID] !== vehicleId) {
      continue;
    }

    // 日付が対象に含まれるかチェック
    const rowDate = row[RESERVATION_DAY_COLS.DATE];
    const dateValue = rowDate instanceof Date
      ? formatDateToString(rowDate)
      : String(rowDate);

    if (!dates.includes(dateValue)) {
      continue;
    }

    // スロット/時間帯の競合チェック
    const existingSlot = row[RESERVATION_DAY_COLS.SLOT];
    const existingEffectiveStart = row[RESERVATION_DAY_COLS.EFFECTIVE_START] || SLOTS[existingSlot]?.start || '08:00';
    const existingEffectiveEnd = row[RESERVATION_DAY_COLS.EFFECTIVE_END] || SLOTS[existingSlot]?.end || '18:00';

    // スロットレベルの競合判定
    const isSlotConflict = checkSlotConflict_(slot, existingSlot);

    // 時間帯の競合判定
    const isTimeConflict = isTimeOverlap(
      newEffective.start, newEffective.end,
      existingEffectiveStart, existingEffectiveEnd
    );

    if (isSlotConflict || isTimeConflict) {
      // 予約者情報を取得
      const reservationInfo = getReservationById(existingResId);

      conflicts.push({
        vehicle_id: vehicleId,
        date: dateValue,
        slot: existingSlot,
        existing_dept: reservationInfo?.dept_name || '',
        existing_name: reservationInfo?.worker_name || '',
        existing_time_range: `${existingEffectiveStart}-${existingEffectiveEnd}`,
        reservation_id: existingResId
      });
    }
  }

  return conflicts;
}

/**
 * スロットレベルの競合をチェック
 * @param {string} slot1 - スロット1
 * @param {string} slot2 - スロット2
 * @return {boolean} 競合があればtrue
 */
function checkSlotConflict_(slot1, slot2) {
  // FULLは全てと競合
  if (slot1 === 'FULL' || slot2 === 'FULL') {
    return true;
  }

  // 同じスロットは競合
  if (slot1 === slot2) {
    return true;
  }

  // AMとPMは競合しない
  return false;
}

// ===========================================
// 部署・作業員 (DeptMaster, WorkerMaster)
// ===========================================

/**
 * 全部署を取得
 * @return {Object[]} 部署オブジェクトの配列
 */
function getDepts() {
  const data = getSheetData_(SHEET_NAMES.DEPT_MASTER);
  const depts = [];

  for (const row of data) {
    if (row[DEPT_COLS.ACTIVE] === true || row[DEPT_COLS.ACTIVE] === 'TRUE') {
      depts.push({
        dept_name: row[DEPT_COLS.DEPT_NAME],
        display_order: row[DEPT_COLS.DISPLAY_ORDER] || 999
      });
    }
  }

  // 表示順でソート
  depts.sort((a, b) => a.display_order - b.display_order);

  return depts;
}

/**
 * 部署に属する作業員を取得
 * @param {string} deptName - 部署名
 * @return {Object[]} 作業員オブジェクトの配列
 */
function getWorkersByDept(deptName) {
  const data = getSheetData_(SHEET_NAMES.WORKER_MASTER);
  const workers = [];

  for (const row of data) {
    const isActive = row[WORKER_COLS.ACTIVE] === true || row[WORKER_COLS.ACTIVE] === 'TRUE';
    const matchesDept = row[WORKER_COLS.DEPT_NAME] === deptName;

    if (isActive && matchesDept) {
      workers.push({
        worker_code: row[WORKER_COLS.WORKER_CODE],
        worker_name: row[WORKER_COLS.WORKER_NAME],
        dept_name: row[WORKER_COLS.DEPT_NAME],
        job: row[WORKER_COLS.JOB] || ''
      });
    }
  }

  // 名前順でソート
  workers.sort((a, b) => a.worker_name.localeCompare(b.worker_name, 'ja'));

  return workers;
}

// ===========================================
// ヘルパー関数
// ===========================================

/**
 * DateオブジェクトならYYYY-MM-DD文字列に変換
 * @param {*} value - 値
 * @return {string} 文字列
 */
function formatDateIfDate_(value) {
  if (value instanceof Date) {
    return formatDateToString(value);
  }
  return String(value || '');
}
