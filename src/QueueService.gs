/** QueueService.gs */

function processQueueCore_(batchSize) {
  batchSize = Number(batchSize || CONFIG.QUEUE_BATCH_SIZE);

  const sheet = sh_(CONFIG.SHEETS.QUEUE);
  const h = headerMap_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return ok({ processed: 0 });

  // 必須列チェック
  ['queue_id','status','payload_json','attempt_count','last_error','updated_at'].forEach(k=>{
    if(!h[k]) throw new Error(`IntegrationQueue missing column: ${k}`);
  });

  // pending を上から batchSize 件取得
  const statusCol = h.status;
  const statuses = sheet.getRange(2, statusCol, lastRow - 1, 1).getValues().map(r => String(r[0]||''));
  const targetRows = [];
  for (let i = 0; i < statuses.length && targetRows.length < batchSize; i++) {
    if (statuses[i] === 'pending') targetRows.push(i + 2);
  }
  if (!targetRows.length) return ok({ processed: 0 });

  let processed = 0;

  for (const r of targetRows) {
    const payloadJson = sheet.getRange(r, h.payload_json).getValue();
    const attempt = Number(sheet.getRange(r, h.attempt_count).getValue() || 0);

    try {
      const payload = JSON.parse(payloadJson);
      // ここで「source_id」でupsertする設計が理想だが、v1では create のみでもOK
      const res = createReservationCore_(payload);
      if (!res.ok && res.code === 'CONFLICT') {
        sheet.getRange(r, h.status).setValue('conflict');
        sheet.getRange(r, h.last_error).setValue(JSON.stringify(res.conflicts));
      } else if (!res.ok) {
        sheet.getRange(r, h.status).setValue('error');
        sheet.getRange(r, h.last_error).setValue(res.message || 'unknown error');
      } else {
        sheet.getRange(r, h.status).setValue('done');
        sheet.getRange(r, h.last_error).setValue('');
      }
      sheet.getRange(r, h.updated_at).setValue(nowIso_());
      sheet.getRange(r, h.attempt_count).setValue(attempt + 1);
      processed++;
    } catch (e) {
      sheet.getRange(r, h.status).setValue('error');
      sheet.getRange(r, h.last_error).setValue(String(e && e.message ? e.message : e));
      sheet.getRange(r, h.updated_at).setValue(nowIso_());
      sheet.getRange(r, h.attempt_count).setValue(attempt + 1);
      processed++;
    }
  }

  return ok({ processed });
}
