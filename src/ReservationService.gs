/** ReservationService.gs */

function getActiveVehicles_() {
  const all = readAllObjects_(CONFIG.SHEETS.VEHICLES);
  return all
    .filter(v => String(v.active).toUpperCase() !== 'FALSE')
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function getDayReservationsJoined_(dateISO) {
  // ReservationDays(date=) を引いて Reservations とJOIN、cancelledは除外
  const targetDate = normalizeToISO_(dateISO);
  const days = readAllObjects_(CONFIG.SHEETS.RES_DAYS).filter(r => normalizeToISO_(r.date) === targetDate);
  if (days.length === 0) return [];

  // ヘッダを一括読み（シンプルに全件 → 今後最適化可）
  const headers = readAllObjects_(CONFIG.SHEETS.RESERVATIONS)
    .filter(h => String(h.status).toLowerCase() === 'active');

  const headerById = new Map(headers.map(h => [String(h.reservation_id), h]));

  return days
    .map(d => {
      const h = headerById.get(String(d.reservation_id));
      if (!h) return null; // cancelled or missing
      return {
        reservation_id: d.reservation_id,
        vehicle_id: h.vehicle_id,
        date: normalizeToISO_(d.date),  // 日付を YYYY-MM-DD 形式に正規化
        slot: d.slot,
        start_time: d.start_time || '',
        end_time: d.end_time || '',
        dept_name: h.dept_name,
        worker_name: h.worker_name,
        worker_code: h.worker_code,
        memo: h.memo || '',
        start_date: normalizeToISO_(h.start_date),  // 予約開始日
        end_date: normalizeToISO_(h.end_date),      // 予約終了日
      };
    })
    .filter(Boolean);
}

function expandDates_(startISO, endISO) {
  const s = parseISODate_(startISO);
  const e = parseISODate_(endISO);
  if (s > e) throw new Error('start_date must be <= end_date');

  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(toISODate_(d));
  }
  return out;
}

function buildConflicts_(vehicleId, dateISO, slot, timeRangeOrNull, existingRows) {
  // existingRows: joined rows for vehicle+date of active reservations
  const conflicts = [];

  // FULLは常に競合（仕様）
  const isFull = slot === 'FULL';
  for (const ex of existingRows) {
    const exSlot = String(ex.slot);
    const exIsFull = exSlot === 'FULL';
    const sameDate = String(ex.date) === String(dateISO);

    if (!sameDate) continue;

    // FULL同士 or FULLとAM/PM
    if (isFull || exIsFull) {
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: (ex.start_time && ex.end_time) ? `${ex.start_time}–${ex.end_time}` : exSlot,
      });
      continue;
    }

    // AM vs PMは競合しない
    if (slot !== exSlot) continue;

    // 同一スロット
    const exTR = normalizeTimeRange_(exSlot, ex.start_time, ex.end_time); // nullなら枠占有
    if (!timeRangeOrNull || !exTR) {
      // 片方でも時間指定無しなら占有＝競合
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: (ex.start_time && ex.end_time) ? `${ex.start_time}–${ex.end_time}` : exSlot,
      });
      continue;
    }

    // 両方時間指定あり：重なり判定
    const overlap = !(timeRangeOrNull.e <= exTR.s || exTR.e <= timeRangeOrNull.s);
    if (overlap) {
      conflicts.push({
        vehicle_id: vehicleId,
        date: dateISO,
        slot: slot,
        existing_dept: ex.dept_name,
        existing_name: ex.worker_name,
        existing_time_range: `${ex.start_time}–${ex.end_time}`,
      });
    }
  }

  return conflicts;
}

function checkConflictsForCreate_(vehicleId, dates, slot, startTime, endTime) {
  const dayJoined = getDayReservationsJoinedBulkByVehicleAndDates_(vehicleId, dates);

  const timeRangeOrNull = normalizeTimeRange_(slot, startTime, endTime); // null=枠占有
  const conflicts = [];

  for (const dateISO of dates) {
    const existing = dayJoined.get(dateISO) || [];
    conflicts.push(...buildConflicts_(vehicleId, dateISO, slot, timeRangeOrNull, existing));
  }
  return conflicts;
}

function getDayReservationsJoinedBulkByVehicleAndDates_(vehicleId, dates) {
  // 取り込み最適化：ReservationDaysを全件読む→filter（まずは簡単版）
  const days = readAllObjects_(CONFIG.SHEETS.RES_DAYS)
    .filter(r => String(r.vehicle_id || '') === '' ? true : true); // vehicle_id列が無い前提なので後で最適化可

  const headers = readAllObjects_(CONFIG.SHEETS.RESERVATIONS)
    .filter(h => String(h.status).toLowerCase() === 'active' && String(h.vehicle_id) === String(vehicleId));

  const headerById = new Map(headers.map(h => [String(h.reservation_id), h]));
  const dateSet = new Set(dates.map(String));

  // ReservationDays は reservation_id, date, slot, start_time, end_time を持つ前提
  const map = new Map(); // dateISO -> joined rows[]
  for (const d of days) {
    if (!dateSet.has(String(d.date))) continue;
    const h = headerById.get(String(d.reservation_id));
    if (!h) continue;
    if (String(h.vehicle_id) !== String(vehicleId)) continue;

    const row = {
      reservation_id: d.reservation_id,
      vehicle_id: h.vehicle_id,
      date: d.date,
      slot: d.slot,
      start_time: d.start_time || '',
      end_time: d.end_time || '',
      dept_name: h.dept_name,
      worker_name: h.worker_name,
      worker_code: h.worker_code,
    };
    if (!map.has(String(d.date))) map.set(String(d.date), []);
    map.get(String(d.date)).push(row);
  }
  return map;
}

function createReservationCore_(payload) {
  // payload validation
  const required = ['vehicle_id', 'start_date', 'end_date', 'slot', 'dept_name', 'worker_code', 'worker_name'];
  required.forEach(k => { if (!payload[k]) throw new Error(`Missing payload.${k}`); });

  const vehicleId = String(payload.vehicle_id);
  const startISO = String(payload.start_date);
  const endISO = String(payload.end_date);
  const slot = String(payload.slot);

  // 時間指定は任意（深い階層）
  const startTime = payload.time_start || payload.start_time || '';
  const endTime = payload.time_end || payload.end_time || '';

  // 期間展開
  const dates = expandDates_(startISO, endISO);

  // 競合チェック
  const conflicts = checkConflictsForCreate_(vehicleId, dates, slot, startTime, endTime);
  if (conflicts.length) {
    return fail('CONFLICT', '既に予約があります。', { conflicts });
  }

  const reservationId = genReservationId_();
  const actor = Session.getActiveUser().getEmail() || 'unknown';
  const ts = nowIso_();

  // ヘッダ作成
  appendObject_(CONFIG.SHEETS.RESERVATIONS, {
    reservation_id: reservationId,
    vehicle_id: vehicleId,
    start_date: startISO,
    end_date: endISO,
    dept_name: payload.dept_name,
    worker_code: payload.worker_code,
    worker_name: payload.worker_name,
    purpose: payload.purpose || '',
    destination: payload.destination || '',
    memo: payload.memo || '',
    source_system: payload.source_system || 'webapp',
    source_id: payload.source_id || '',
    source_url: payload.source_url || '',
    status: 'active',
    created_at: ts,
    created_by: actor,
    updated_at: ts,
    updated_by: actor,
  });

  // 日別明細
  // 複数日予約の場合: 初日=出発時間〜18:00, 中日=終日, 最終日=08:00〜帰社時間
  const isMultiDay = payload.is_multi_day === true || dates.length > 1;
  const departureTime = payload.departure_time || startTime || '';
  const returnTime = payload.return_time || endTime || '';
  const slotTimes = CONFIG.SLOT[slot] || { start: '08:00', end: '18:00' };

  dates.forEach((dateISO, idx) => {
    let daySlot = slot;
    let dayStartTime = '';
    let dayEndTime = '';
    let effStart = '';
    let effEnd = '';

    if (isMultiDay && dates.length > 1) {
      const isFirstDay = idx === 0;
      const isLastDay = idx === dates.length - 1;
      const isMiddleDay = !isFirstDay && !isLastDay;

      if (isFirstDay) {
        // 初日: 出発時間 〜 18:00
        daySlot = 'FULL';
        dayStartTime = departureTime || '08:00';
        dayEndTime = '18:00';
        effStart = dayStartTime;
        effEnd = dayEndTime;
      } else if (isLastDay) {
        // 最終日: 08:00 〜 帰社時間
        daySlot = 'FULL';
        dayStartTime = '08:00';
        dayEndTime = returnTime || '18:00';
        effStart = dayStartTime;
        effEnd = dayEndTime;
      } else {
        // 中日: 終日
        daySlot = 'FULL';
        dayStartTime = '08:00';
        dayEndTime = '18:00';
        effStart = '08:00';
        effEnd = '18:00';
      }
    } else {
      // 単日予約
      dayStartTime = startTime || '';
      dayEndTime = endTime || '';
      effStart = dayStartTime || slotTimes.start || '';
      effEnd = dayEndTime || slotTimes.end || '';
    }

    const conflictKey = `${vehicleId}|${dateISO}`;

    appendObject_(CONFIG.SHEETS.RES_DAYS, {
      reservation_id: reservationId,
      vehicle_id: vehicleId,
      date: dateISO,
      slot: daySlot,
      start_time: dayStartTime,
      end_time: dayEndTime,
      effective_start: effStart,
      effective_end: effEnd,
      conflict_key: conflictKey,
      created_at: ts,
      updated_at: ts,
    });
  });

  return ok({ reservation_id: reservationId });
}

function cancelReservationCore_(reservationId) {
  const actor = Session.getActiveUser().getEmail() || 'unknown';
  const ts = nowIso_();
  const updated = updateRowsByKey_(CONFIG.SHEETS.RESERVATIONS, 'reservation_id', reservationId, {
    status: 'cancelled',
    updated_at: ts,
    updated_by: actor,
  });
  if (!updated) return fail('NOT_FOUND', '予約が見つかりません。');
  return ok({ reservation_id: reservationId });
}
