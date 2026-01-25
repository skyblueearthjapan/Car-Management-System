# シート構造（列順序）

各シートの正確な列順序。実装時のヘッダ行参照用。

---

## 1. Vehicles（車両マスタ）

車両の表示枠・並び順・UIスタイルを管理します。

### 列順序（A〜J）

```
A: vehicle_id
B: name
C: category
D: display_order
E: plate_no
F: ui_style
G: image_drive_file_id
H: active
I: tags
J: notes
```

---

## 2. Reservations（予約ヘッダ）

reservation_id はApps Scriptで採番。dept/workerは必須。source_* は外部連携（生産管理など）用（任意）。

### 列順序（A〜U）

```
A: reservation_id    (自動採番)
B: vehicle_id
C: start_date
D: end_date
E: dept_name
F: worker_code
G: worker_name
H: purpose           (任意)
I: destination       (任意)
J: memo              (任意)
K: status            (active/cancelled)
L: period_days
M: created_at
N: created_by
O: updated_at
P: updated_by
Q: source_system     (連携)
R: source_id         (連携)
S: source_url        (連携)
T: source_last_sync_at (連携：日時)
U: display_label
```

---

## 3. ReservationDays（日別明細）

日別のスロット/時間指定。競合判定の基礎データ（アプリから自動生成・更新）。

### 列順序（A〜L）

```
A: reservation_id
B: vehicle_id
C: date
D: slot              (AM/PM/FULL)
E: start_time
F: end_time
G: effective_start   (空の時はslot定義にフォールバック)
H: effective_end     (空の時はslot定義にフォールバック)
I: conflict_key      (vehicle_id|date)
J: created_at
K: updated_at
L: notes
```

### サンプルデータ

| slot | effective_start | effective_end |
|------|-----------------|---------------|
| AM | 08:00 | 13:00 |

---

## 4. DeptMaster（部署マスタ：同期）

同期元：LW／作業日報_全従業員用 の「部署マスタ」。原則手編集しない。

### 列順序（A〜E）

```
A: dept_name
B: active
C: display_order
D: notes
E: synced_at
```

---

## 5. WorkerMaster（作業員マスタ：同期）

同期元：LW／作業日報_全従業員用 の「作業員マスタ」。部署で絞り込み→氏名選択に使用。

### 列順序（A〜G）

```
A: worker_code
B: worker_name
C: dept_name
D: job               (任意)
E: active
F: synced_at
G: notes
```

### サンプルデータ

| worker_code | worker_name | dept_name | job | active |
|-------------|-------------|-----------|-----|--------|
| 1001 | (例) 田村 修二 | (例) 機械設計 | (任意) | TRUE |

---

## 6. IntegrationQueue（外部連携キュー）

生産管理など外部システムからの予約投入を安全に処理するためのキュー（任意）。直接Reservationsへ書き込まず、サーバ側で競合チェックして反映する。

### 列順序（A〜Q）

```
A: queue_id
B: enqueued_at
C: source_system
D: source_id
E: vehicle_id
F: start_datetime
G: end_datetime
H: slot_hint
I: dept_name
J: worker_code
K: worker_name
L: payload_json
M: status            (pending/processing/success/failure)
N: processed_at
O: reservation_id
P: error_message
Q: retry_count
```

### サンプルデータ

| status | retry_count |
|--------|-------------|
| pending | 0 |

---

## 7. SyncLog（同期ログ）

マスタ同期の実行履歴。監査・トラブルシュート用。

### 列順序（A〜I）

```
A: run_id
B: run_at
C: status            (success/failure)
D: dept_rows
E: worker_rows
F: duration_ms
G: error_message
H: triggered_by      (time_trigger/manual)
I: source_spreadsheet_id
```

### サンプルデータ

| run_id | status | triggered_by | source_spreadsheet_id |
|--------|--------|--------------|----------------------|
| SYNC-0001 | success | time_trigger | 1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ |

---

## 8. Lists（選択肢リスト）

データ検証用の選択肢（アプリ・DBで共通利用）。原則編集しない。

### 定義済みリスト

**vehicle_category（列A-B）**
| value |
|-------|
| owned |
| borrowable |

**reservation_status（列C-D）**
| value |
|-------|
| active |
| cancelled |

**slot（列E-F）**
| value |
|-------|
| AM |
| PM |
| FULL |

**source_system（列G-H）**
| value |
|-------|
| webapp |
| seisan |
| van |
| kei_truck |
| suv |
| other |

**queue_status（列I-J）**
| value |
|-------|
| pending |
| processing |
| success |
| failure |

---

## シートタブ順序（実際のスプレッドシート）

```
README → DataDictionary → Settings → Vehicles → DeptMaster → WorkerMaster → Reservations → ReservationDays → IntegrationQueue → SyncLog → Lists
```

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.1 | 2026-01-25 | 初版作成（スクリーンショットより抽出） |
