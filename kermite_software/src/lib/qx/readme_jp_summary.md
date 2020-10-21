# qx

## これはなんですか

- シンプルなUIフレームワークです
- Reactに似た見た目です
- 小規模な画面のプロトタイピングに適しています

## 方針

- Mithril好きだけどReactの文法で書きたい
- 実行時のパフォーマンスよりも、実装や保守の効率を重視します
- 機能の調整がやりやすいようにミニマルな構成を保ちます

## Reactとの違い

### 画面の描画制御
DOMのイベントハンドラの処理が終わるタイミングで画面全体が再描画されます(Mithril方式)

### ローカル状態の管理
クラスコンポーネントやHooksはありません。その代わりにクロージャコンポーネントを使ってビューのローカルな状態を保持します。

## 機能

コンポーネントを作りやすくするため、JSXの構文を拡張しています。

- クロージャコンポーネント
- css 拡張プロパティ
- qxIf 拡張プロパティ
- qxOptimizer 拡張プロパティ

## 内部実装

petit-domという仮想DOMライブラリをカスタマイズして使用しています。