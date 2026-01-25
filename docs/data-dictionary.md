# DataDictionary（定義書）

各テーブル/カラムの意味と必須条件。UI・API実装の参照用。

---

## 1. Vehicles（車両マスタ）

| column | required | type | description |
|--------|----------|------|-------------|
| vehicle_id | Y | string | 車両ID（V0001など）。Apps Script/UIで参照する主キー。 |
| name | Y | string | 表示名（例：ハイエース8080）。 |
| category | Y | enum | `owned` / `borrowable`（メイン or 右下枠）。 |
| display_order | Y | number | 表示順。ownedは1〜、borrowableは100〜推奨。 |
| plate_no | N | string | ナンバー等（任意）。 |
| ui_style | N | enum | `sedan`/`minivan`/`van`/`kei_truck`/`suv`...（UI描画ヒント）。 |
| image_drive_file_id | N | string | 画像に逃げる場合のDrive File ID。 |
| active | Y | bool | 非表示/廃車対応。TRUEのみ表示。 |
| tags | N | string | タグ（任意）。 |
| notes | N | string | 備考（任意）。 |

### 初期データ（車両マスタ）

| vehicle_id | name | category | display_order | plate_no | ui_style | active |
|------------|------|----------|---------------|----------|----------|--------|
| V0001 | カローラホワイト | owned | 1 | - | sedan | TRUE |
| V0002 | 軽トラA | owned | 2 | - | kei_truck | TRUE |
| V0003 | 軽トラB | owned | 3 | - | kei_truck | TRUE |
| V0004 | ノア | owned | 4 | - | minivan | TRUE |
| V0005 | ハイエース8080 | owned | 5 | 8080 | van | TRUE |
| V0006 | ハイエース5050 | owned | 6 | 5050 | van | TRUE |
| V0007 | カローラシルバー | borrowable | 100 | - | sedan | TRUE |
| V0008 | CX5 | borrowable | 101 | - | suv | TRUE |

---

## 2. Reservations（予約ヘッダ）

| column | required | type | description |
|--------|----------|------|-------------|
| reservation_id | Y | string | 予約ID（採番：R...）。 |
| vehicle_id | Y | string | 対象車両ID。 |
| start_date | Y | date | 予約開始日。 |
| end_date | Y | date | 予約終了日（複数日）。 |
| dept_name | Y | string | 部署名（DeptMasterから選択）。 |
| worker_code | Y | string | 作業員コード（WorkerMaster）。 |
| worker_name | Y | string | 氏名（WorkerMaster）。表示に使用。 |
| purpose | N | string | 用途（任意）。 |
| destination | N | string | 行先/現場（任意）。 |
| memo | N | string | メモ（任意）。 |
| status | Y | enum | `active` / `cancelled`。 |
| period_days | N | number | 予約期間（日数）。シート側で算出（確認用）。 |
| created_at | Y | datetime | 作成日時。 |
| created_by | Y | string | 作成者（メール等）。 |
| updated_at | Y | datetime | 更新日時。 |
| updated_by | Y | string | 更新者（メール等）。 |
| source_system | N | enum | 連携元。`webapp` / `seisan` など。空なら手動/本アプリ起点。 |
| source_id | N | string | 連携元のユニークID（生産管理の予定ID等）。create/updateの同一性判定に使用。 |
| source_url | N | string | 連携元詳細URL（任意）。 |
| source_last_sync_at | N | datetime | 連携元と同期した最終日時（任意）。 |
| display_label | N | string | 表示用（dept_name / worker_name を連結）。 |

---

## 3. ReservationDays（予約日別明細）

| column | required | type | description |
|--------|----------|------|-------------|
| reservation_id | Y | string | ReservationsへのFK。 |
| vehicle_id | Y | string | 検索性のため保持（冗長だが実用上必要）。 |
| date | Y | date | 対象日。 |
| slot | Y | enum | `AM` / `PM` / `FULL`。 |
| start_time | N | time | 時間指定（任意）。空ならスロット全体を占有。 |
| end_time | N | time | 時間指定（任意）。 |
| effective_start | N | time | 表示/判定用（空の時はslot定義にフォールバック）。 |
| effective_end | N | time | 表示/判定用（空の時はslot定義にフォールバック）。 |
| conflict_key | N | string | `vehicle_id\|date`のキー（監査/検索用）。 |
| created_at | N | datetime | 作成日時（任意：監査用）。 |
| updated_at | N | datetime | 更新日時（任意：監査用）。 |
| notes | N | string | 備考（任意）。 |

### スロット定義（固定）

| slot | 開始時刻 | 終了時刻 |
|------|----------|----------|
| AM | 08:00 | 13:00 |
| PM | 13:00 | 18:00 |
| FULL | 08:00 | 18:00 |

---

## 4. DeptMaster（部署マスタ - 同期）

| column | required | type | description |
|--------|----------|------|-------------|
| dept_name | Y | string | 部署名一覧（同期）。 |
| active | Y | bool | 有効フラグ。TRUEのみ表示。 |
| display_order | N | number | 表示順。 |
| notes | N | string | 備考（任意）。 |
| synced_at | N | datetime | 同期日時。 |

---

## 5. WorkerMaster（作業員マスタ - 同期）

同期元：LW／作業日報_全従業員用 の「作業員マスタ」。部署で絞り込み→氏名選択に使用。

| column | required | type | description |
|--------|----------|------|-------------|
| worker_code | Y | string | 作業員コード（同期）。 |
| worker_name | Y | string | 氏名（同期）。 |
| dept_name | Y | string | 所属部署（同期）。UIで絞り込みに使用。 |
| job | N | string | 担当業務（同期元に合わせる）。 |
| active | Y | bool | 有効フラグ。TRUEのみ表示。 |
| synced_at | N | datetime | 同期日時。 |
| notes | N | string | 備考（任意）。 |

### サンプルデータ

| worker_code | worker_name | dept_name | job | active |
|-------------|-------------|-----------|-----|--------|
| 1001 | (例) 田村 修二 | (例) 機械設計 | (任意) | TRUE |

---

## 6. SyncLog（同期ログ）

マスタ同期の実行履歴。監査・トラブルシュート用。

| column | required | type | description |
|--------|----------|------|-------------|
| run_id | Y | string | 同期実行ID（例：SYNC-0001）。 |
| run_at | Y | datetime | 同期実行日時。 |
| status | Y | enum | `success` / `failure`。 |
| dept_rows | N | number | 同期した部署件数。 |
| worker_rows | N | number | 同期した作業員件数。 |
| duration_ms | N | number | 処理時間（ミリ秒）。 |
| error_message | N | string | 失敗時エラー。 |
| triggered_by | N | string | トリガー種別（`time_trigger` / `manual`）。 |
| source_spreadsheet_id | N | string | 同期元スプレッドシートID。 |

---

## 7. IntegrationQueue（外部連携キュー）

生産管理など外部システムからの予約投入を安全に処理するためのキュー（任意）。直接Reservationsへ書き込まず、サーバ側で競合チェックして反映する。

| column | required | type | description |
|--------|----------|------|-------------|
| queue_id | Y | string | キューID（自動採番）。 |
| enqueued_at | Y | datetime | 投入日時。 |
| source_system | Y | enum | 連携元（`seisan` 等）。 |
| source_id | Y | string | 連携元ユニークID。 |
| vehicle_id | Y | string | 対象車両ID。 |
| start_datetime | Y | datetime | 開始日時。 |
| end_datetime | Y | datetime | 終了日時。 |
| slot_hint | N | enum | スロットヒント（`AM` / `PM` / `FULL`）。 |
| dept_name | Y | string | 部署名。 |
| worker_code | Y | string | 作業員コード。 |
| worker_name | Y | string | 作業員名。 |
| payload_json | N | string | 連携ペイロード（JSON文字列）。 |
| status | Y | enum | `pending` / `processing` / `success` / `failure`。 |
| processed_at | N | datetime | 処理完了日時。 |
| reservation_id | N | string | 作成/更新した予約ID（成功時）。 |
| error_message | N | string | 失敗時のエラー。 |
| retry_count | N | number | リトライ回数（任意）。 |

---

## 8. Settings（設定）

管理者が設定する固定値・リスト・運用設定。

| 設定項目 | 説明 |
|----------|------|
| スロット定義 | AM/PM/FULLの時刻 |
| その他運用設定 | 必要に応じて追加 |

---

## 9. Lists（選択肢リスト）

データ検証用の選択肢。原則触らない（非表示運用可）。

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.1 | 2026-01-25 | 初版作成（スクリーンショットより抽出） |
