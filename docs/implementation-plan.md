# 実装計画書

設計仕様書を統合・整理し、実装フェーズを順序立てて記載します。

---

## 1. システム概要（統合版）

### 技術スタック
| レイヤー | 技術 |
|----------|------|
| DB | Google Spreadsheet |
| Backend/API | Google Apps Script |
| Frontend | HTML + CSS + JavaScript（Apps Script WebApp） |

### 画面構成
- **1画面構成**（SPA的な動作）
- 上部：週タブ（7日分）+ 日付移動ボタン + 保存状態表示
- 中央：保有車両カード（owned: 6台）
- 右下：借用可能車両カード（borrowable: 2台）

### スロット定義（固定）
| スロット | 時間帯 |
|----------|--------|
| AM | 08:00–13:00 |
| PM | 13:00–18:00 |
| FULL | 08:00–18:00 |

---

## 2. DBシート構成（11シート）

| # | シート名 | 役割 | 操作者 |
|---|----------|------|--------|
| 1 | README | DB説明書 | - |
| 2 | DataDictionary | 列定義書 | - |
| 3 | Settings | 設定値 | 管理者 |
| 4 | Vehicles | 車両マスタ | 管理者 |
| 5 | DeptMaster | 部署マスタ（同期） | システム |
| 6 | WorkerMaster | 作業員マスタ（同期） | システム |
| 7 | Reservations | 予約ヘッダ | システム |
| 8 | ReservationDays | 予約日別明細 | システム |
| 9 | IntegrationQueue | 外部連携キュー | システム |
| 10 | SyncLog | 同期ログ | システム |
| 11 | Lists | 選択肢リスト | - |

---

## 3. 実装フェーズ

### Phase 0: 環境準備

| # | タスク | 詳細 |
|---|--------|------|
| 0-1 | DBスプレッドシート作成 | 11シートの作成、ヘッダ行設定 |
| 0-2 | 車両マスタ初期データ投入 | 8台の車両データ |
| 0-3 | 部署マスタ初期データ投入 | 7部署（同期前の仮データ） |
| 0-4 | Apps Scriptプロジェクト作成 | clasp or GAS Editor |
| 0-5 | 基本ファイル構成作成 | Code.gs, api.gs, db.gs, Index.html, etc. |

---

### Phase 1: MVP（最小動作版）

#### 1-1. Backend API（Apps Script）

| # | 関数名 | 説明 | 優先度 |
|---|--------|------|--------|
| 1 | `doGet()` | HTMLを返す | 必須 |
| 2 | `getInit(date)` | 初期データ取得（車両一覧、指定日の予約、部署一覧） | 必須 |
| 3 | `getDay(date)` | 指定日の予約一覧（軽量再描画用） | 必須 |
| 4 | `getWorkersByDept(deptName)` | 部署に属する作業員一覧 | 必須 |
| 5 | `createReservation(payload)` | 予約作成（競合チェック含む） | 必須 |
| 6 | `cancelReservation(reservationId)` | 予約キャンセル | 必須 |

**createReservation payload例:**
```javascript
{
  vehicle_id: "V0001",
  start_date: "2026-01-23",
  end_date: "2026-01-25",
  slot: "AM",
  dept_name: "機械設計",
  worker_code: "1001",
  worker_name: "田村 修二",
  purpose: "現場訪問",
  destination: "○○工場",
  memo: ""
}
```

#### 1-2. DB操作モジュール（db.gs）

| # | 関数名 | 説明 |
|---|--------|------|
| 1 | `getVehicles()` | 車両一覧取得（active=TRUEのみ） |
| 2 | `getReservationsByDate(date)` | 指定日の予約取得 |
| 3 | `getDepts()` | 部署一覧取得 |
| 4 | `getWorkersByDept(deptName)` | 部署別作業員取得 |
| 5 | `insertReservation(data)` | 予約ヘッダ挿入 |
| 6 | `insertReservationDays(reservationId, days)` | 予約明細挿入 |
| 7 | `checkConflict(vehicleId, dates, slot)` | 競合チェック |
| 8 | `generateReservationId()` | 予約ID採番（R + 日付 + 連番） |

#### 1-3. Frontend（HTML/CSS/JS）

**ファイル構成:**
```
Index.html      # メインHTML
css.html        # スタイルシート（<style>タグ）
js.html         # JavaScript（<script>タグ）
```

**UIコンポーネント:**

| # | コンポーネント | 説明 |
|---|----------------|------|
| 1 | Header | システム名、週タブ |
| 2 | SubHeader | 選択日表示、前日/今日/翌日、保存状態 |
| 3 | VehicleCards | 車両カード群（owned/borrowable） |
| 4 | VehicleCard | 個別車両カード（予約状態表示） |
| 5 | ReservationModal | 予約作成/詳細モーダル |
| 6 | DeptWorkerSelector | 部署→氏名の連動選択 |

**JS関数:**

| # | 関数名 | 説明 |
|---|--------|------|
| 1 | `init()` | 初期化、データ取得、描画 |
| 2 | `renderWeekTabs(baseDate)` | 週タブ描画 |
| 3 | `selectDate(date)` | 日付選択、予約再取得 |
| 4 | `renderVehicles(vehicles, reservations)` | 車両カード描画 |
| 5 | `openReservationModal(vehicleId, slot)` | 予約モーダル表示 |
| 6 | `onDeptChange(deptName)` | 部署変更→作業員リスト更新 |
| 7 | `submitReservation()` | 予約送信 |
| 8 | `cancelReservation(reservationId)` | 予約キャンセル |

---

### Phase 2: マスタ同期

| # | タスク | 詳細 |
|---|--------|------|
| 2-1 | `syncMasters()` 実装 | 外部スプレッドシートから部署/作業員を同期 |
| 2-2 | SyncLog記録 | 同期結果をログに記録 |
| 2-3 | 時間主導トリガー設定 | 毎日06:00に自動同期 |

**同期元情報:**
- Spreadsheet ID: `1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ`
- 対象シート: 部署マスタ、作業員マスタ

---

### Phase 3: 機能拡張

| # | タスク | 詳細 |
|---|--------|------|
| 3-1 | 予約更新機能 | `updateReservation()` |
| 3-2 | 時間指定機能 | start_time/end_time対応 |
| 3-3 | 日別カスタム編集 | ReservationDaysの個別編集UI |
| 3-4 | 車両UIスタイル強化 | CSS/SVGアイコン（sedan/van/kei_truck等） |
| 3-5 | 管理者用同期ボタン | 手動マスタ同期 |

---

### Phase 4: 外部連携（オプション）

| # | タスク | 詳細 |
|---|--------|------|
| 4-1 | IntegrationQueue処理 | キューからの予約取り込み |
| 4-2 | ポーリングトリガー | 60秒間隔でキュー処理 |
| 4-3 | 外部API | 外部システムからのキュー投入API |

---

## 4. ファイル構成（推奨）

```
/
├── Code.gs              # doGet(), include()
├── api.gs               # UIから呼ばれるAPI関数
├── db.gs                # DB操作（CRUD）
├── sync.gs              # マスタ同期処理
├── utils.gs             # ユーティリティ（日付処理、ID生成等）
├── constants.gs         # 定数（シート名、列インデックス等）
├── Index.html           # メインHTML
├── css.html             # スタイルシート
├── js.html              # JavaScript
└── components/
    ├── header.html      # ヘッダーコンポーネント
    ├── modal.html       # モーダルコンポーネント
    └── card.html        # カードコンポーネント
```

---

## 5. 競合チェックロジック

### 判定ルール

```
同一 vehicle_id + 同一 date で：

FULL vs FULL → 競合
FULL vs AM   → 競合
FULL vs PM   → 競合
AM vs AM     → 競合
PM vs PM     → 競合
AM vs PM     → OK（競合しない）

時間指定ありの場合：
→ effective_start/effective_end の重なりで判定
```

### 実装

```javascript
function checkConflict(vehicleId, dates, slot, startTime, endTime) {
  // 1. ReservationDaysから該当vehicle_id + datesの予約を取得
  // 2. 各日について競合判定
  // 3. 競合があれば詳細情報を返す
  // 4. なければnullを返す
}
```

---

## 6. 注意事項・重複整理

### 設計仕様書間の差異（整理済み）

| 項目 | v1.0 | DBテンプレート | 採用 |
|------|------|----------------|------|
| Reservationsの列数 | 15列 | 21列（source_*追加） | **21列** |
| ReservationDaysのvehicle_id | なし | あり（検索性のため） | **あり** |
| IntegrationQueue | 言及なし | 詳細定義あり | **Phase 4で実装** |
| borrowableのdisplay_order | 1〜 | 100〜 | **100〜推奨** |

### 実装時の注意

1. **排他制御**: 保存系APIは必ず `LockService.getScriptLock()` を使用
2. **競合チェック**: ロック取得後、書込前に必ず再チェック
3. **ID採番**: `reservation_id` は `R` + YYYYMMDD + `-` + 連番（例: R20260123-001）
4. **日付形式**: すべて `YYYY-MM-DD` 形式で統一
5. **時刻形式**: `HH:MM` 形式（24時間表記）

---

## 7. 実装順序チェックリスト

### Phase 0（環境準備）
- [ ] DBスプレッドシート作成
- [ ] 全シートのヘッダ行設定
- [ ] Vehiclesマスタデータ投入（8台）
- [ ] DeptMasterデータ投入（7部署）
- [ ] Listsシート設定
- [ ] Settingsシート設定
- [ ] Apps Scriptプロジェクト作成

### Phase 1（MVP）
- [ ] constants.gs（定数定義）
- [ ] utils.gs（ユーティリティ）
- [ ] db.gs（DB操作）
- [ ] api.gs（API関数）
- [ ] Code.gs（doGet）
- [ ] Index.html（基本構造）
- [ ] css.html（スタイル）
- [ ] js.html（ロジック）
- [ ] 動作確認（予約作成→表示→キャンセル）

### Phase 2（マスタ同期）
- [ ] sync.gs（同期処理）
- [ ] SyncLog記録
- [ ] トリガー設定

### Phase 3以降
- [ ] 予約更新機能
- [ ] 時間指定機能
- [ ] UI強化

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.0 | 2026-01-25 | 初版作成（設計仕様書統合） |
