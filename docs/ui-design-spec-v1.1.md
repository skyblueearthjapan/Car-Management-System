# UIデザイン仕様 vUI-1.1（"圧倒的に見やすい＆可愛い"寄せ）

## 1) ダサく見える典型を潰す（必須ルール）

### 禁止
- 罫線だらけ（細線で囲いすぎ）
- 文字が小さい/詰まってる/余白がない
- "状態"が色だけ（文字が弱い）
- 車の形がバラバラ（線幅・角丸・比率が揃ってない）

### 採用
- "面"で見せる（枠線最小、影も最小）
- タイポは階層をはっきり（見出し/ラベル/本文）
- 状態は バッジ＋見出し文言で確定的に示す
- 車シルエットは 同一線幅・同一角丸・同一テイストで統一

---

## 2) 画面レイアウト（縦積みをカッコよく見せる作法）

**車両タイル（owned＝メイン）を「縦に伸びる車」にする**
- 上：車のシルエット（横長、主役）
- 中：車両名（太字・大きく）
- 下：AM / PM の2段（ここを"面"で区切る）

縦積みでも "車→名前→状態" の順で視線誘導できると、急に洗練されます。

---

## 3) 車両タイルの見た目仕様（これが命）

### サイズ（推奨）
- owned：幅 240〜280px / 高さ 340〜420px（レスポンシブ）
- borrowable：幅 160〜190px / 高さ 220〜260px（右下パネル内）

### タイポ（推奨）
- 車両名：18〜20px / 700
- 状態（使えません等）：14〜16px / 700
- 部署＋氏名：16〜18px / 800（ここは主役級）
- 時間帯：12px / 600（AM(8-13)など）

### 余白（超重要）
- タイル内 padding：16px
- 車シルエットと車名：8〜10px
- AM/PMブロック間：10〜12px

---

## 4) 状態表現（"誰が使ってるか"を主役に）

AM/PMブロックは カード内カードにして、状態は必ず「文字」でも確定させます。

### 表示文言（固定）
- 空き：`空き（予約できます）`
- 使用中：`使えません（予約あり）`

### 表示内容（使用中）
- 1行目：使えません（予約あり）（強）
- 2行目：部署名　氏名（最強）
- 3行目（任意）：09:30–11:00（時間指定ある時のみ）

### 見た目の差（色＋面）
- 空き：明るい面＋「空き」バッジ
- 使用中：濃い面＋「使用中」バッジ＋ストライプ薄背景（やりすぎない）

---

## 5) 右下「たまに借りる車」パネル（小さく・でも存在感）

- 右下固定
- タイトル：たまに借りる車
- 小タイル2枚を横並び（スマホなら縦）
- 小タイルは AM/PMを簡略にして、詳細はタップでモーダル

---

## 6) "可愛く統一した"SVG（カテゴリ別：そのまま使える骨格）

実装側では currentColor とCSS変数で色を統一、線幅は全部同じにします。

### 6-1. SVG共通ルール
- viewBox：`0 0 200 120`
- stroke-width：`6`
- stroke-linecap/linejoin：`round`
- 塗りは基本なし（必要なら薄い塗りだけ）

### sedan（カローラ等）

```svg
<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M35 72 L55 48 Q62 40 78 40 H122 Q138 40 145 48 L165 72" />
    <path d="M28 72 H172 Q182 72 182 82 V88 Q182 96 174 96 H26 Q18 96 18 88 V82 Q18 72 28 72 Z" />
    <circle cx="55" cy="96" r="10" />
    <circle cx="145" cy="96" r="10" />
    <path d="M78 40 L92 72 H108 L122 40" />
  </g>
</svg>
```

### van_box（ハイエース）

```svg
<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 50 Q30 40 40 40 H150 Q170 40 175 60 L182 78 V88 Q182 96 174 96 H26 Q18 96 18 88 V64 Q18 50 30 50 Z"/>
    <path d="M60 40 V78" />
    <path d="M95 40 V78" />
    <circle cx="55" cy="96" r="10" />
    <circle cx="145" cy="96" r="10" />
  </g>
</svg>
```

### minivan（ノア）

```svg
<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 60 Q30 42 48 40 H140 Q158 40 170 58 L182 76 V88 Q182 96 174 96 H26 Q18 96 18 88 V74 Q18 62 28 60 Z"/>
    <path d="M58 40 V76" />
    <path d="M92 40 V76" />
    <path d="M126 40 V76" />
    <circle cx="55" cy="96" r="10" />
    <circle cx="145" cy="96" r="10" />
  </g>
</svg>
```

### kei_truck（軽トラ）

```svg
<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 62 H108 V42 H140 Q160 42 170 58 L182 72 V88 Q182 96 174 96 H26 Q18 96 18 88 V72 Q18 62 28 62 Z"/>
    <path d="M108 62 H28" />
    <path d="M108 42 H62 Q50 42 45 52 L40 62" />
    <circle cx="55" cy="96" r="10" />
    <circle cx="145" cy="96" r="10" />
  </g>
</svg>
```

### suv（CX5）

```svg
<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 70 L55 45 Q62 38 78 38 H122 Q140 38 150 50 L170 70" />
    <path d="M24 70 H176 Q184 70 184 78 V88 Q184 98 174 98 H26 Q16 98 16 88 V78 Q16 70 24 70 Z" />
    <circle cx="55" cy="98" r="10" />
    <circle cx="145" cy="98" r="10" />
    <path d="M82 38 L96 70 H112 L126 38" />
  </g>
</svg>
```

---

## 7) CSS "見た目の勝ち筋"（これがダサさ回避の核心）

色の指定は実装時に変えられますが、余白・角丸・面の扱いがセンスを決めます。

```css
:root{
  --r-lg: 22px;   /* タイル角丸 */
  --r-md: 16px;   /* 内側ブロック角丸 */
  --pad: 16px;
  --gap: 12px;
  --line: rgba(10,20,30,.10);

  --txt: #0b1220;
  --muted: rgba(11,18,32,.60);

  --ok-bg: rgba(20,180,120,.12);
  --ng-bg: rgba(240,70,70,.12);

  --ok-badge: rgba(20,180,120,.18);
  --ng-badge: rgba(240,70,70,.18);
}

.vehicle-tile{
  border-radius: var(--r-lg);
  background: #fff;
  border: 1px solid var(--line);
  padding: var(--pad);
  display:flex; flex-direction:column;
  gap: 10px;
}

.vehicle-icon{
  height: 88px;
  color: rgba(11,18,32,.85);
}

.vehicle-name{
  font-size: 19px;
  font-weight: 800;
  letter-spacing: .02em;
}

.slot{
  border-radius: var(--r-md);
  padding: 12px 12px;
  border: 1px solid var(--line);
  display:flex; flex-direction:column;
  gap: 6px;
}

.slot.ok{ background: var(--ok-bg); }
.slot.ng{ background: var(--ng-bg); }

.slot-head{
  display:flex; align-items:center; justify-content:space-between;
  font-size: 12px; font-weight: 700; color: var(--muted);
}

.badge{
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
}
.ok .badge{ background: var(--ok-badge); }
.ng .badge{ background: var(--ng-badge); }

.slot-title{
  font-size: 15px;
  font-weight: 900;
}
.slot-user{
  font-size: 17px;
  font-weight: 900;
  letter-spacing: .01em;
}
.slot-time{
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
```

---

## 8) "即NG判定"を先に満たすチェックリスト（ここ超重要）

実装後に、一瞬で判断できるように基準を固定：

- [ ] 車のシルエットが統一テイスト（線幅/角丸/比率）で可愛い
- [ ] 車名が大きく、視線が迷わない
- [ ] AM/PMの 空き/使えない が一瞬で分かる（色だけじゃない）
- [ ] 使用中は 部署＋氏名が主役（小さくない）
- [ ] borrowable は右下固定で小さいが、押しやすい
- [ ] 罫線がうるさくない（面で区切れている）

---

## 実装指示サマリ

コーディングエージェントへの指示：
1. まずSVGで形を作る（上の5種）
2. VehicleTileに当日AM/PMを縦積み表示
3. 使用中は "使えません（予約あり）＋部署 氏名" を太字で
4. borrowableは右下固定の小タイル
