# 完全プロンプト：車両予約Webアプリ（GAS + Spreadsheet DB + HTML）v1.0

あなたはコーディングエージェントです。以下仕様に従い、Google Apps Script（V8）+ Spreadsheet をDBとして使う車両予約Webアプリを実装してください。UIは「ミニマル×高級感」で、車両を車の形（SVG）で表示し、当日AM/PMの空き/使用中（部署＋氏名）を一目で分かるようにします。保存は即時保存（操作確定ごとにサーバへ）で、サーバ側で競合チェックを必ず行い、競合時はCONFLICTで返します。部署/作業員マスタは別スプレッドシートから同期し、予約者は「部署→氏名の選択式」で必須です。外部（生産管理）からの自動転記はIntegrationQueueを介して処理できるようにします。

---

## 1. 固定ルール（時間枠）

- **AM**：08:00–13:00
- **PM**：13:00–18:00
- **FULL**：08:00–18:00（終日扱い）
- 時間指定は可能（深い階層UI）。時間指定がある場合は、指定したslot枠内に収める。

---

## 2. DB（Spreadsheet）シート構造（v1.1前提）

DBスプレッドシートには以下シートが存在する前提：

- Vehicles
- Reservations（ヘッダ）
- ReservationDays（日別明細）
- DeptMaster（同期先）
- WorkerMaster（同期先）
- SyncLog
- IntegrationQueue（外部連携キュー）
- Settings / Lists / DataDictionary / README（補助）

### Vehicles（例）

- **owned**：カローラホワイト、軽トラA、軽トラB、ノア、ハイエース8080、ハイエース5050
- **borrowable**：カローラシルバー、CX5

Vehiclesには `ui_style` がある（sedan/minivan/van_box/kei_truck/suv）。無い場合は車名から推定しても良い。

### Reservations外部連携用列

- `source_system`（webapp / seisan など）
- `source_id`（外部側ID。ユニーク）
- `source_url`（任意）

### IntegrationQueue列

- queue_id, source_system, source_id, payload_json, desired_status, status, attempt_count, last_error, created_at, updated_at

---

## 3. 予約モデル（重要）

予約は2テーブル：**Reservations（ヘッダ）＋ReservationDays（日別）**

### Reservations（ヘッダ）

**必須**：reservation_id, vehicle_id, start_date, end_date, dept_name, worker_code, worker_name, status, created_at, created_by, updated_at, updated_by

**任意**：purpose, destination, memo, source_system, source_id, source_url

### ReservationDays（日別）

**必須**：reservation_id, date, slot（AM/PM/FULL）

**任意**：start_time, end_time（HH:MM）

---

## 4. 競合判定（サーバ側必須・排他必須）

保存系（create/cancel/update/queue_process）は必ず：

1. `LockService.getScriptLock()` で排他
2. 競合チェック→OKなら書込、NGなら `code:"CONFLICT"` で返す

### 競合ルール（同一vehicle_id + 同一date で判定）

1. **FULL は AM/PM と常に競合**
2. **AM同士、PM同士は競合**
3. **時間指定がある場合**：
   - start_time/end_time がある予約同士は時間重なりで競合
   - 一方が時間指定なし（空）なら、そのslot枠全体を占有＝必ず競合
4. **FULLの時間指定があっても、FULLはAM/PMと競合**（終日扱いなので）

### 競合エラーの返却

```javascript
{
  ok: false,
  code: 'CONFLICT',
  conflicts: [{vehicle_id, date, slot, existing_dept, existing_name, existing_time_range}]
}
```

---

## 5. マスタ同期（別スプレッドシート → DB）

### 同期元スプレッドシートID

```
1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ
```

シート：部署マスタ、作業員マスタ

### 同期先

DBの DeptMaster / WorkerMaster を全件置換。SyncLogに結果を記録。

### 同期タイミング

- 時間主導トリガー（例：毎日06:00）
- `syncMasters()` 関数を実装（手動実行も可能）

---

## 6. UI仕様（ミニマル×高級感、当日表示、車の形）

### 6.1 画面

- **上部**：週タブ（7日）＋前日/今日/翌日＋保存状態表示
- **中央**：owned車両を大きいVehicleTileで表示（グリッド）
- **右下固定**：borrowable車両を小さいVehicleTileで表示（2台）

### 6.2 VehicleTile（主役）

- 車のシルエット（SVG）を表示（ui_styleに応じて）
- 車両名（太字大きめ）
- AM/PM 2ブロックを縦積み表示
- 各ブロックは「面＋バッジ＋文言」で状態表示
  - **空き**：バッジ「空き」＋文言「予約できます」
  - **使用中**：バッジ「使用中」＋文言「使えません（予約あり）」＋「部署 氏名」を大きく表示
  - 時間指定があれば `※ 09:30–11:00` を追加

**FULL予約はAM/PM両方を使用中表示**

### 6.3 SVG

5カテゴリのSVGを実装：

- sedan
- minivan
- van_box
- kei_truck
- suv

（stroke-width=6, round, viewBox 0 0 200 120、currentColor利用）

---

## 7. 予約操作（直感的 / 即時保存）

### 7.1 クリック

- AM/PMブロックをクリック可能
- **空き**→予約作成モーダル
- **使用中**→詳細モーダル（部署/氏名/期間/メモ）＋取消

### 7.2 予約作成モーダル（必須）

**入力**：

- 部署（必須、検索付きプルダウン）
- 氏名（必須、部署で絞り込み）
- 期間：開始日～終了日（デフォは当日）
- スロット：AM/PM/FULL（デフォはクリックした枠。FULL選択可能）
- 詳細（折りたたみ）：
  - 日別編集（期間内の日一覧に対してslotを変更可能：v1では後回し可）
  - 時間指定（slot内で start/end を入れられる：v1では後回し可）

**保存**：

- 確定→即時API呼び出し→成功ならUI更新
- 競合ならCONFLICT表示（既存の部署/氏名をメッセージで強く表示）

### 7.3 保存状態表示

- 右上に `保存中…` → `保存済み` を表示
- v1では保存は即時なので、API中だけ保存中表示でOK

---

## 8. サーバ（Apps Script）構成

### 8.1 ファイル構成（推奨）

- Code.gs（エントリ、共通）
- Db.gs（シート操作）
- ReservationService.gs（予約作成/取消/競合判定）
- MasterSync.gs（同期）
- QueueService.gs（IntegrationQueue処理）
- Ui.html（HTML本体）
- Ui.css.html（CSS）
- Ui.js.html（JS）

### 8.2 doGet

- HTMLを返す（テンプレート）
- 初期は getInit(today) を呼ぶ設計（クライアントからでもOK）

### 8.3 クライアント⇄サーバ通信

- `google.script.run` を使用
- 返却は `{ok:true, data:...}` / `{ok:false, code:"CONFLICT", conflicts:[...]}` のように統一

---

## 9. サーバAPI（必須実装）

### getInit(dateISO)

- vehicles（active, display_order順）
- dayReservations（当日のReservationDaysをヘッダ情報とJOINした表示用データ）
- deptList（DeptMaster）

### getDay(dateISO)

- dayReservations（同上）

### getWorkersByDept(deptName)

- WorkerMasterから絞り込み

### createReservation(payload)

```javascript
{
  vehicle_id,
  start_date, end_date,
  slot,                   // AM/PM/FULL
  dept_name,
  worker_code,
  worker_name,
  purpose?, destination?, memo?,
  time_start?, time_end?   // 任意（v1で後回し可）
  source_system: "webapp",
  source_id: ""            // webappは空でOK
}
```

- Reservations作成 + ReservationDaysを期間分自動生成（全日同一slot）
- 競合チェック、排他

### cancelReservation(reservation_id)

- statusをcancelledに、updated_*更新

### syncMasters()

- 同期実行、SyncLog記録

### processQueue(batchSize=20)

- IntegrationQueueの status=pending を取得→順に createOrUpdateBySourceId を行う
- 成功：status=done
- 競合：status=conflict, last_errorに詳細
- 失敗：status=error, attempt_count++

---

## 10. 当日表示データ（JOIN仕様）

getDay/getInit で返す dayReservations は、UIが即描画できる形に整形する。

### 返却例

```javascript
[
  {
    vehicle_id,
    slot,                     // AM/PM/FULL
    dept_name,
    worker_name,
    start_time, end_time,
    reservation_id
  }
]
```

### フロントでの組み立て

- FULLがあればAM/PM両方を使用中で埋める
- AM/PMはそれぞれ埋める
- 空きはデフォルト生成

---

## 11. UI実装の最終要件（品質）

- 余白で魅せる。罫線を増やさない。
- タイポ階層：車名 > 部署氏名 > 状態文言 > 時刻
- 状態は色だけでなく、必ず文言とバッジで示す。
- borrowable は右下固定で小さく、押しやすい。
- UIがダサい場合はNG。CSS固定値に従い、統一感を崩さない。

---

## 12. 最低限の動作確認（完了条件）

1. DBからVehiclesが読み込まれ、ownedが中央、borrowableが右下に出る
2. 当日AM/PMの空き/使用中が明確に表示され、使用中は部署＋氏名が大きく出る
3. 空き枠クリック→部署→氏名→確定で予約できる
4. 予約後、当日表示が即更新され「使えません」が出る
5. 競合予約はサーバで弾かれ、既存の部署＋氏名を表示して失敗する
6. Dept/Workerマスタは同期関数でDBに取り込める

---

## 実装上の注意（必須）

- Spreadsheetアクセスはヘッダ行から列位置を解決し、列増減に耐えること
- 予約IDは衝突しない採番（日時＋連番等）
- 競合チェックは必ず排他ロック内で行う
- UIはレスポンシブ（幅が狭いときはグリッド列数が減る）
- エラーはユーザーにわかる日本語メッセージでトースト表示

---

以上。まずMVPをこの仕様で実装し、後で「日別カスタム」「時間指定」「更新（変更）」「権限」へ拡張する。
