# UI実装仕様 vUI-2.0（ミニマル×高級感・確定案）

## 0. デザインコンセプト（絶対に崩さない）

- **余白で魅せる**
- **線は最小限**（罫線で囲わない）
- **状態は"面＋バッジ＋文言"の3点セット**
- 車シルエットは **同一線幅・同一角丸・同一リズムで統一**
- 色は抑えめ。強調は **タイポの強さでやる**（高級感）

---

## 1. 画面構造（HTML）— 最終の骨格

```html
<body class="app">
  <header class="topbar">
    <div class="brand">
      <div class="logo">LINE WORKS</div>
      <div class="subtitle">車両予約</div>
    </div>

    <nav class="weekTabs" aria-label="週タブ">
      <!-- 7 buttons -->
      <button class="dayTab is-active">
        <div class="dayTab__date">1/23</div>
        <div class="dayTab__dow">金</div>
        <div class="dayTab__badge">1</div>
      </button>
    </nav>

    <div class="topActions">
      <div class="saveState is-saved">保存済み</div>
      <div class="navBtns">
        <button class="btn">前日</button>
        <button class="btn btn--primary">今日</button>
        <button class="btn">翌日</button>
      </div>
    </div>
  </header>

  <main class="canvas">
    <section class="owned">
      <div class="dateTitle">
        <div class="dateTitle__main">2026-01-23（金）</div>
        <div class="dateTitle__sub">AM 08:00–13:00 / PM 13:00–18:00</div>
      </div>

      <div class="grid">
        <!-- VehicleTile (owned) -->
        <article class="vehicleTile" data-style="sedan" data-state="am-ok pm-ng">
          <div class="vehicleTile__top">
            <div class="vehicleIcon" aria-hidden="true"><!-- SVG injected --></div>
            <div class="vehicleMeta">
              <div class="vehicleName">カローラホワイト</div>
              <div class="vehicleTag">SEDAN</div>
            </div>
          </div>

          <div class="slots">
            <button class="slot slot--ok" data-slot="AM">
              <div class="slot__head">
                <div class="slot__label">AM</div>
                <div class="slot__badge">空き</div>
              </div>
              <div class="slot__title">予約できます</div>
              <div class="slot__time">08:00–13:00</div>
            </button>

            <button class="slot slot--ng" data-slot="PM">
              <div class="slot__head">
                <div class="slot__label">PM</div>
                <div class="slot__badge">使用中</div>
              </div>
              <div class="slot__title">使えません（予約あり）</div>
              <div class="slot__user">機械設計　今泉</div>
              <div class="slot__time">13:00–18:00</div>
              <div class="slot__detail">※ 15:00–17:00</div><!-- 時間指定がある場合のみ -->
            </button>
          </div>
        </article>
      </div>
    </section>

    <aside class="borrowPanel">
      <div class="borrowPanel__title">たまに借りる車</div>
      <div class="borrowPanel__grid">
        <!-- small VehicleTile (borrowable) -->
      </div>
    </aside>
  </main>

  <!-- modal root -->
  <div id="modalRoot"></div>
</body>
```

### "高級感"の肝

- `vehicleTile__top` は 左：シルエット／右：車名 のバランスで「主役」を作る
- AM/PM は 縦積み2ブロック。余白と面で分ける
- 右下の borrow は `aside` を固定し、存在を控えめに出す

---

## 2. CSS（デザイン固定値）— センスを数値で縛る

色は"ほぼ無彩色＋ごく薄いアクセント"。影は極小。境界線は髪の毛。

```css
:root{
  /* layout */
  --bg: #f5f6f8;
  --card: #ffffff;
  --ink: #0b1220;
  --muted: rgba(11,18,32,.62);
  --hair: rgba(11,18,32,.10);

  /* radii */
  --r-xl: 24px;
  --r-lg: 18px;
  --r-md: 14px;

  /* spacing */
  --pad-lg: 18px;
  --pad-md: 14px;
  --gap-lg: 14px;
  --gap-md: 10px;

  /* type */
  --t-title: 20px;
  --t-name: 18px;
  --t-body: 14px;
  --t-small: 12px;

  /* state surfaces (subtle) */
  --ok-surface: rgba(18, 180, 120, .10);
  --ng-surface: rgba(240, 70, 70, .10);

  /* badges */
  --ok-badge: rgba(18, 180, 120, .16);
  --ng-badge: rgba(240, 70, 70, .16);

  /* shadow: tiny */
  --shadow: 0 10px 30px rgba(11,18,32,.06);
}

*{ box-sizing:border-box; }
body.app{
  margin:0;
  background: var(--bg);
  color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
}

.topbar{
  position: sticky; top:0;
  z-index: 50;
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--hair);
  padding: 12px 16px;
  display:flex; align-items:center; gap: 16px;
}

.brand .logo{ font-weight: 900; letter-spacing:.06em; font-size: 14px; }
.brand .subtitle{ font-size: 12px; color: var(--muted); margin-top:2px; }

.weekTabs{ display:flex; gap:8px; flex:1; justify-content:center; }
.dayTab{
  border: 1px solid var(--hair);
  background: #fff;
  border-radius: 14px;
  padding: 8px 10px;
  min-width: 66px;
  display:grid; gap:2px;
  box-shadow: none;
  cursor:pointer;
}
.dayTab.is-active{
  box-shadow: var(--shadow);
  border-color: rgba(11,18,32,.18);
}
.dayTab__date{ font-weight: 900; font-size: 14px; }
.dayTab__dow{ font-size: 11px; color: var(--muted); }
.dayTab__badge{
  justify-self:end;
  font-size: 11px; font-weight: 900;
  background: rgba(11,18,32,.08);
  padding: 2px 6px; border-radius: 999px;
}

.topActions{ display:flex; align-items:center; gap: 12px; }
.saveState{
  font-size: 12px; font-weight: 800;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--hair);
  background:#fff;
  color: var(--muted);
}
.saveState.is-saving{ color: var(--ink); }
.saveState.is-saved{ color: var(--muted); }

.btn{
  border: 1px solid var(--hair);
  background:#fff;
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 800;
  cursor:pointer;
}
.btn--primary{
  border-color: rgba(11,18,32,.18);
  box-shadow: var(--shadow);
}

.canvas{
  position: relative;
  padding: 18px 18px 90px;
}

.dateTitle{ margin: 8px 0 14px; }
.dateTitle__main{ font-size: var(--t-title); font-weight: 900; }
.dateTitle__sub{ font-size: 12px; color: var(--muted); margin-top: 2px; }

.grid{
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.vehicleTile{
  background: var(--card);
  border: 1px solid var(--hair);
  border-radius: var(--r-xl);
  padding: var(--pad-lg);
  box-shadow: var(--shadow);
  display:flex;
  flex-direction:column;
  gap: 12px;
}

.vehicleTile__top{
  display:flex;
  gap: 12px;
  align-items:center;
}

.vehicleIcon{
  width: 120px;
  height: 72px;
  color: rgba(11,18,32,.86);
  flex: 0 0 auto;
}

.vehicleMeta{ display:flex; flex-direction:column; gap: 6px; }
.vehicleName{
  font-size: var(--t-name);
  font-weight: 950;
  letter-spacing: .02em;
}
.vehicleTag{
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .12em;
  font-weight: 900;
}

.slots{ display:flex; flex-direction:column; gap: 12px; }

.slot{
  text-align:left;
  border: 1px solid var(--hair);
  border-radius: var(--r-lg);
  padding: var(--pad-md);
  background: #fff;
  cursor:pointer;
  display:flex; flex-direction:column; gap: 8px;
}

.slot--ok{ background: var(--ok-surface); }
.slot--ng{ background: var(--ng-surface); }

.slot__head{ display:flex; justify-content:space-between; align-items:center; }
.slot__label{ font-size: var(--t-small); font-weight: 900; color: var(--muted); letter-spacing:.14em; }
.slot__badge{
  font-size: 11px; font-weight: 950;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(11,18,32,.08);
}
.slot--ok .slot__badge{ background: var(--ok-badge); }
.slot--ng .slot__badge{ background: var(--ng-badge); }

.slot__title{ font-size: 15px; font-weight: 950; }
.slot__user{ font-size: 17px; font-weight: 950; letter-spacing:.01em; }
.slot__time{ font-size: 12px; color: var(--muted); font-weight: 850; }
.slot__detail{ font-size: 12px; color: var(--muted); font-weight: 850; }

.borrowPanel{
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 420px;
  max-width: calc(100vw - 36px);
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px);
  border: 1px solid var(--hair);
  border-radius: var(--r-xl);
  padding: 14px;
  box-shadow: var(--shadow);
}
.borrowPanel__title{
  font-weight: 950;
  letter-spacing:.06em;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}
.borrowPanel__grid{
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
}

/* small tile for borrowable */
.vehicleTile--small{
  border-radius: var(--r-xl);
  padding: 12px;
  box-shadow: none;
}
.vehicleTile--small .vehicleIcon{ width: 92px; height: 56px; }
.vehicleTile--small .vehicleName{ font-size: 14px; }
.vehicleTile--small .slots{ gap: 8px; }
.vehicleTile--small .slot{ padding: 10px; border-radius: var(--r-md); }
.vehicleTile--small .slot__user{ font-size: 13px; }
```

---

## 3. SVG（車形状）— "かわいく統一"のまま高級感へ

- 既に提示した5種類のSVG（sedan/minivan/van_box/kei_truck/suv）を採用
- 必ず同じ `stroke-width=6`、`round`、`viewBox`統一
- 車種ごとの違いは 窓の分割数・ボディ形状のみで抑える（上品）

### UIスタイル割り当て（固定）

| 車両名 | ui_style |
|--------|----------|
| カローラホワイト / カローラシルバー | sedan |
| ノア | minivan |
| ハイエース8080 / 5050 | van_box |
| 軽トラA / 軽トラB | kei_truck |
| CX5 | suv |

---

## 4. "使えない"を圧倒的に分かりやすく（表示ルール）

### 4-1. AM/PMブロックの状態

| 状態 | クラス | バッジ | タイトル |
|------|--------|--------|----------|
| 空き | `slot--ok` | 空き | 予約できます |
| 使用中 | `slot--ng` | 使用中 | 使えません（予約あり） |

**使用中の追加表示:**
- ユーザー：`部署　氏名`（大きく太く）
- 時間指定がある場合：`※ 09:30–11:00` を追加

### 4-2. FULL予約の表示

- FULL が当日に存在したら **AM/PM両方を使用中として表示**
- 同じ部署・氏名を両方に表示

---

## 5. データ→UIのマッピング仕様（フロントの実装指示）

### 当日データ（集計後）の構造

```typescript
type SlotState = {
  status: "ok" | "ng";
  label: "空き" | "使用中";
  title: string;                 // ok: 予約できます / ng: 使えません（予約あり）
  deptName?: string;
  workerName?: string;
  timeRange?: string;            // "09:30–11:00" のような表示用
};

type VehicleDayView = {
  vehicleId: string;
  name: string;
  uiStyle: "sedan"|"minivan"|"van_box"|"kei_truck"|"suv";
  category: "owned"|"borrowable";
  am: SlotState;
  pm: SlotState;
};
```

### 生成ロジック（サーバ or フロント）

1. ReservationDays を当日でフィルタ
2. FULL があれば AM/PM を ng で埋める
3. AM/PM はそれぞれ埋める
4. 時間指定があれば timeRange を生成（start/end）

---

## 6. 操作（直感的UI / 保存は確実）

- **空き枠クリック** → 予約作成モーダル（期間はデフォ当日、スロットは選択枠）
- **使用中枠クリック** → 詳細モーダル（部署/氏名/期間/メモ、取消ボタン）
- **保存は即時サーバ保存**（「煩わしさを省く」最優先）
- `saveState` は "見た目の安心" として右上に出す（保存中/保存済み）

---

## 7. コーディングエージェント向け指示文（そのまま貼れる）

### 要件

1. 当日分のみ描画。上部に週タブ＋前日/今日/翌日。
2. owned車両は大きい車タイルで表示。borrowableは右下固定の小パネルに2台。
3. 車はSVGシルエットで表現（sedan/minivan/van_box/kei_truck/suv）。
4. 各車タイルに車名を必ず表示。
5. AM(08-13) / PM(13-18) を縦積み2ブロックで表示し、空き/使用中を明確化。
6. 使用中は必ず「使えません（予約あり）」＋「部署 氏名」を大きく表示。
7. FULL予約はAM/PM両方を使用中表示。
8. 保存は操作確定のたび即時API呼び出し。競合はサーバがCONFLICTで返す。

### UI品質

- ミニマル×高級感。線は最小限、余白で魅せる。
- 状態表現は "面＋バッジ＋文言" の3点セット。
- CSSの固定値は仕様に従い、見た目の統一を崩さない。

---

## 8. "即NG"が出た時の最短修正ポイント

「うーん…」となるのは、ほぼここ：

1. **余白が足りない** → padding/gapを増やす
2. **文字の強弱が弱い** → 車名と部署氏名をさらに太く大きく
3. **線が多い** → borderをさらに減らし"面"を増やす
4. **SVGの統一感が崩れる** → stroke/角丸/比率の統一を再徹底
