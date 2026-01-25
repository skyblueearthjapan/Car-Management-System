/**
 * 車両管理予約システム - API関数
 * api.gs
 *
 * UIから google.script.run で呼び出される関数群
 */

// ===========================================
// 初期化・データ取得
// ===========================================

/**
 * 初期データを取得
 * @param {string} dateStr - 日付（YYYY-MM-DD）、省略時は今日
 * @return {Object} 初期データ
 */
function getInit(dateStr) {
  try {
    const targetDate = dateStr || formatDateToString(new Date());

    // 車両一覧
    const vehicles = getVehicles();

    // 指定日の予約
    const reservations = getReservationsByDate(targetDate);

    // 部署一覧
    const depts = getDepts();

    // 週の日付配列
    const weekDates = getWeekDates(targetDate).map(d => ({
      date: formatDateToString(d),
      dayOfWeek: getDayOfWeekJa(d)
    }));

    // スロット定義
    const slots = Object.values(SLOTS);

    return successResponse({
      currentDate: targetDate,
      weekDates: weekDates,
      vehicles: vehicles,
      reservations: reservations,
      depts: depts,
      slots: slots
    });

  } catch (e) {
    console.error('getInit error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);
  }
}

/**
 * 指定日の予約を取得（軽量版）
 * @param {string} dateStr - 日付（YYYY-MM-DD）
 * @return {Object} 予約データ
 */
function getDay(dateStr) {
  try {
    if (!isValidDateFormat(dateStr)) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '日付形式が不正です');
    }

    const reservations = getReservationsByDate(dateStr);

    return successResponse({
      date: dateStr,
      reservations: reservations
    });

  } catch (e) {
    console.error('getDay error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);
  }
}

/**
 * 部署に属する作業員を取得
 * @param {string} deptName - 部署名
 * @return {Object} 作業員データ
 */
function getWorkersByDeptApi(deptName) {
  try {
    if (!deptName) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '部署名が必要です');
    }

    const workers = getWorkersByDept(deptName);

    return successResponse({
      dept_name: deptName,
      workers: workers
    });

  } catch (e) {
    console.error('getWorkersByDeptApi error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);
  }
}

// ===========================================
// 予約操作
// ===========================================

/**
 * 予約を作成
 * @param {Object} payload - 予約データ
 * @return {Object} 結果
 */
function createReservation(payload) {
  // 排他ロックを取得
  const lock = LockService.getScriptLock();

  try {
    // 最大30秒待機してロック取得
    lock.waitLock(30000);

    // バリデーション
    const validation = validateRequired(payload, [
      'vehicle_id', 'start_date', 'end_date', 'slot',
      'dept_name', 'worker_code', 'worker_name'
    ]);

    if (!validation.valid) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, `必須項目が不足: ${validation.missing.join(', ')}`);
    }

    if (!isValidDateFormat(payload.start_date) || !isValidDateFormat(payload.end_date)) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '日付形式が不正です');
    }

    if (!isValidSlot(payload.slot)) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, 'スロットが不正です');
    }

    // 車両の存在確認
    const vehicle = getVehicleById(payload.vehicle_id);
    if (!vehicle) {
      return errorResponse(ERROR_CODES.NOT_FOUND, '車両が見つかりません');
    }

    // 日付範囲を生成
    const dates = getDateRange(payload.start_date, payload.end_date);
    if (dates.length === 0) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '日付範囲が不正です');
    }

    // 競合チェック
    const conflicts = checkConflict(
      payload.vehicle_id,
      dates,
      payload.slot,
      payload.start_time || '',
      payload.end_time || '',
      null
    );

    if (conflicts.length > 0) {
      return errorResponse(ERROR_CODES.CONFLICT, '予約が競合しています', { conflicts: conflicts });
    }

    // 予約ヘッダを作成
    const reservationId = insertReservation({
      vehicle_id: payload.vehicle_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      dept_name: payload.dept_name,
      worker_code: payload.worker_code,
      worker_name: payload.worker_name,
      purpose: payload.purpose || '',
      destination: payload.destination || '',
      memo: payload.memo || ''
    });

    // 予約日別明細を作成
    insertReservationDays(
      reservationId,
      payload.vehicle_id,
      dates,
      payload.slot,
      payload.start_time || '',
      payload.end_time || ''
    );

    return successResponse({
      reservation_id: reservationId,
      message: '予約を作成しました'
    });

  } catch (e) {
    console.error('createReservation error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);

  } finally {
    // ロックを解放
    lock.releaseLock();
  }
}

/**
 * 予約をキャンセル
 * @param {string} reservationId - 予約ID
 * @return {Object} 結果
 */
function cancelReservationApi(reservationId) {
  // 排他ロックを取得
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!reservationId) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '予約IDが必要です');
    }

    // 予約の存在確認
    const reservation = getReservationById(reservationId);
    if (!reservation) {
      return errorResponse(ERROR_CODES.NOT_FOUND, '予約が見つかりません');
    }

    if (reservation.status === RESERVATION_STATUS.CANCELLED) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, 'この予約は既にキャンセルされています');
    }

    // キャンセル実行
    const success = cancelReservation(reservationId);

    if (success) {
      return successResponse({
        reservation_id: reservationId,
        message: '予約をキャンセルしました'
      });
    } else {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, 'キャンセルに失敗しました');
    }

  } catch (e) {
    console.error('cancelReservationApi error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);

  } finally {
    lock.releaseLock();
  }
}

/**
 * 予約詳細を取得
 * @param {string} reservationId - 予約ID
 * @return {Object} 予約詳細
 */
function getReservationDetail(reservationId) {
  try {
    if (!reservationId) {
      return errorResponse(ERROR_CODES.INVALID_PARAMS, '予約IDが必要です');
    }

    const reservation = getReservationById(reservationId);
    if (!reservation) {
      return errorResponse(ERROR_CODES.NOT_FOUND, '予約が見つかりません');
    }

    // 車両情報も取得
    const vehicle = getVehicleById(reservation.vehicle_id);

    return successResponse({
      reservation: reservation,
      vehicle: vehicle
    });

  } catch (e) {
    console.error('getReservationDetail error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);
  }
}

// ===========================================
// ユーザー情報
// ===========================================

/**
 * 現在のユーザー情報を取得
 * @return {Object} ユーザー情報
 */
function getMe() {
  try {
    const email = getCurrentUserEmail();

    return successResponse({
      email: email
    });

  } catch (e) {
    console.error('getMe error:', e);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, e.message);
  }
}
