# Chrome拡張機能: XMLリンカー

## プロジェクトの目的

Chrome拡張機能で、XMLファイルの内容を見やすく表示し、URLをクリック可能なリンクにする。

## 主な機能

- XMLファイルのURLを検出
- 各URLのステータスをチェック
- クリック可能なリンクに変換
- ツールチップでURLステータスを表示
- XMLコンテンツを整形して表示

## 実装詳細

### ファイル構成

```bash
extension/
├── manifest.json
├── popup.html
├── js/
│   ├── background.js
│   └── popup.js
└── img/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 主な機能実装

#### `background.js`

- URLステータスをチェックするメッセージリスナーを実装
- `fetch` APIを使用してURLの有効性を確認

#### `popup.js`

主な機能:

1. XMLファイルからURLを抽出
2. 各URLのステータスをチェック
3. XMLを整形
4. リンク付きのXMLページを生成

##### 主要な関数

- `formatXMLWithIndent()`: XMLを整形
- `extractUrls()`: URLを抽出
- `checkUrlStatus()`: URLのステータスをチェック
- `createLinkedXMLPage()`: リンク付きXMLページを生成

#### `popup.html`

- 拡張機能のUIを定義
- 「リンク付きXMLページを生成」ボタンを配置

## 今後の改善点

- より堅牢なXML解析
- エラーハンドリングの強化
- パフォーマンスの最適化

## 開発状況

- バージョン: 0.2
- ステータス: ベータ版

## 注意点

- 大規模なXMLファイルの処理には制限あり
- すべてのXML形式に対応しているわけではない
