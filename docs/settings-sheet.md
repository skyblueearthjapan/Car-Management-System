# Settings シート（設定）

固定値と運用設定。アプリ/スクリプトから参照します。

> このシートのスロット定義は競合判定・表示の基準になります。
> Apps Script側でも同じ定義を参照するため、値の変更は原則しない運用を推奨します。

---

## 予約スロット定義（固定）

| slot | start_time | end_time | note |
|------|------------|----------|------|
| AM | 08:00 | 13:00 | 午前：08:00-13:00（固定） |
| PM | 13:00 | 18:00 | 午後：13:00-18:00（固定） |
| FULL | 08:00 | 18:00 | 終日：08:00-18:00（固定） |

---

## マスタ同期元（固定）

| 設定キー | 値 | 説明 |
|----------|-----|------|
| source_spreadsheet_id | `1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ` | LW／作業日報_全従業員用 |
| source_sheet_dept | 部署マスタ | 同期対象シート名（変更する場合のみ） |
| source_sheet_worker | 作業員マスタ | 同期対象シート名（変更する場合のみ） |

---

## UI設定（任意）

| 設定キー | 値 | 説明 |
|----------|-----|------|
| week_start | MON | 週タブの開始曜日（MON推奨） |

---

## 外部連携設定（任意）

| 設定キー | 値 | 説明 |
|----------|-----|------|
| integration_enabled | FALSE | TRUEで外部連携を有効（生産管理など）。 |
| integration_mode | queue | `queue`（推奨）/ `direct`（直接書込は非推奨）。 |
| integration_default_source | seisan | source_systemの既定値。 |
| integration_queue_poll_interval_sec | 60 | キュー方式のポーリング間隔（秒）。 |
| integration_allow_overwrite | FALSE | TRUEで外部予約の上書きを許可（運用方針次第）。 |

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.1 | 2026-01-25 | 初版作成（スクリーンショットより抽出） |
