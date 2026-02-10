# ファビコンのキャッシュをクリアする方法

## 1. ブラウザのハードリフレッシュ
- **Windows/Linux**: `Ctrl + Shift + R` または `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

## 2. 開発者ツールでキャッシュクリア
1. `F12`で開発者ツールを開く
2. ネットワークタブを開く
3. 「Disable cache」にチェック
4. 右クリック → 「Empty Cache and Hard Reload」

## 3. ブラウザのデータクリア
### Chrome:
1. `Ctrl + Shift + Delete`
2. 「キャッシュされた画像とファイル」を選択
3. 「データを削除」

## 4. 直接ファビコンにアクセス
ブラウザで直接開く:
- http://localhost:3000/icon.png

## 5. シークレットモードで確認
- `Ctrl + Shift + N` (Chrome)
- `Ctrl + Shift + P` (Firefox)

## 6. ブラウザを完全に再起動
1. すべてのタブを閉じる
2. ブラウザを完全に終了
3. ブラウザを再起動

## 7. 強制的にファビコンを更新
favicon.icoを削除してPNGのみにする
