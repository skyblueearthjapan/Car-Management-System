# マスタデータ（初期データ）

スプレッドシートDBに投入する初期データ。

---

## Vehicles（車両マスタ）

車両の表示枠・並び順・UIスタイルを管理します。

### ヘッダ行（列構成）

```
vehicle_id | name | category | display_order | plate_no | ui_style | image_drive_file_id | active | tags | notes
```

### 初期データ（8台）

| vehicle_id | name | category | display_order | plate_no | ui_style | image_drive_file_id | active | tags | notes |
|------------|------|----------|---------------|----------|----------|---------------------|--------|------|-------|
| V0001 | カローラホワイト | owned | 1 | | sedan | | TRUE | | |
| V0002 | 軽トラA | owned | 2 | | kei_truck | | TRUE | | |
| V0003 | 軽トラB | owned | 3 | | kei_truck | | TRUE | | |
| V0004 | ノア | owned | 4 | | minivan | | TRUE | | |
| V0005 | ハイエース8080 | owned | 5 | 8080 | van | | TRUE | | |
| V0006 | ハイエース5050 | owned | 6 | 5050 | van | | TRUE | | |
| V0007 | カローラシルバー | borrowable | 101 | | sedan | | TRUE | | |
| V0008 | CX5 | borrowable | 102 | | suv | | TRUE | | |

### カテゴリ別表示

**owned（メイン表示エリア）**: 6台
- カローラホワイト、軽トラA、軽トラB、ノア、ハイエース8080、ハイエース5050

**borrowable（右下エリア）**: 2台
- カローラシルバー、CX5

---

## DeptMaster（部署マスタ：同期）

同期元：LW／作業日報_全従業員用 の「部署マスタ」。原則手編集しない。

### ヘッダ行（列構成）

```
dept_name | active | display_order | notes | synced_at
```

### 初期データ（7部署）

| dept_name | active | display_order | notes | synced_at |
|-----------|--------|---------------|-------|-----------|
| 製缶・溶接 | TRUE | 1 | | |
| 機械加工 | TRUE | 2 | | |
| 組立・塗装 | TRUE | 3 | | |
| 機械設計 | TRUE | 4 | | |
| 電気設計 | TRUE | 5 | | |
| TSC | TRUE | 6 | | |
| 業務 | TRUE | 7 | | |

---

## WorkerMaster（作業員マスタ：同期）

同期元：LW／作業日報_全従業員用 の「作業員マスタ」。原則手編集しない。

### ヘッダ行（列構成）

```
worker_code | worker_name | dept_name | job
```

> ※実データは同期元から自動取得

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.1 | 2026-01-25 | 初版作成（スクリーンショットより抽出） |
