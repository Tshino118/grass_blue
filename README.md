# 🚁 DJI Tello Multi-Drone Monitor

複数台のDJI Telloドローンからの映像を低レイテンシで受信し、Webブラウザ上でリアルタイム監視するアプリケーションです。

## 📋 目次

- [概要](#概要)
- [機能](#機能)
- [システム構成](#システム構成)
- [要件](#要件)
- [インストール](#インストール)
- [使用方法](#使用方法)
- [API仕様](#api仕様)
- [トラブルシューティング](#トラブルシューティング)
- [開発者向け情報](#開発者向け情報)

## 概要

DJI Tello Multi-Drone Monitorは、複数のDJI Telloドローンを同時に制御・監視するためのWebアプリケーションです。
低レイテンシ映像配信、リアルタイムテレメトリ、直感的なWebインターフェースを提供します。

### 主な特徴

- 🎥 **低レイテンシ映像配信**: WebRTCとFFmpegを活用した高速映像ストリーミング
- 🔄 **リアルタイム通信**: WebSocketによるリアルタイムデータ交換
- 📊 **テレメトリ監視**: バッテリー、温度、高度などのドローン情報をリアルタイム表示
- 🎛️ **直感的UI**: レスポンシブデザインによる使いやすいWebインターフェース
- 🐳 **コンテナ対応**: Docker/Docker Composeによる簡単デプロイ
- 🔧 **スケーラブル**: Docker Swarmによる分散デプロイメント対応

## 機能

### ドローン管理
- ドローンの接続・切断
- IPアドレスによる手動接続
- バッテリー残量、温度、高度などのテレメトリ表示
- 複数ドローンの一括操作

### 映像配信
- リアルタイム映像ストリーミング
- 複数ドローン同時表示
- FPS・レイテンシ表示
- WebRTC使用による低遅延配信

### 監視・制御
- ドローン状態の一覧表示
- 詳細情報モーダル
- ストリーム開始・停止制御
- 接続状態の可視化

## システム構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  DJI Tello #1   │    │  DJI Tello #2   │    │  DJI Tello #N   │
└─────┬───────────┘    └─────┬───────────┘    └─────┬───────────┘
      │ WiFi UDP              │ WiFi UDP              │ WiFi UDP
      └─────────────┬─────────────────┬─────────────────┘
                    │                 │
                    ▼                 ▼
            ┌─────────────────────────────────┐
            │      Backend Server             │
            │  ┌─────────────────────────┐    │
            │  │   Tello Manager         │    │
            │  │   - Connection Mgmt     │    │
            │  │   - Video Capture       │    │
            │  │   - Telemetry          │    │
            │  └─────────────────────────┘    │
            │                                 │
            │  ┌─────────────────────────┐    │
            │  │   Flask + SocketIO      │    │
            │  │   - REST API            │    │
            │  │   - WebSocket Server    │    │
            │  └─────────────────────────┘    │
            └─────────────┬───────────────────┘
                          │ HTTP/WebSocket
                          ▼
            ┌─────────────────────────────────┐
            │      Frontend Server            │
            │  ┌─────────────────────────┐    │
            │  │   Nginx + Static Files  │    │
            │  │   - HTML/CSS/JS         │    │
            │  │   - Reverse Proxy       │    │
            │  └─────────────────────────┘    │
            └─────────────┬───────────────────┘
                          │ HTTP
                          ▼
            ┌─────────────────────────────────┐
            │      WebRTC Server              │
            │  ┌─────────────────────────┐    │
            │  │   aiortc + WebSockets   │    │
            │  │   - Video Streaming     │    │
            │  │   - P2P Connection      │    │
            │  └─────────────────────────┘    │
            └─────────────┬───────────────────┘
                          │ WebRTC
                          ▼
            ┌─────────────────────────────────┐
            │      Web Browser                │
            │  ┌─────────────────────────┐    │
            │  │   Monitor Interface     │    │
            │  │   - Live Video          │    │
            │  │   - Control Panel       │    │
            │  │   - Telemetry Display   │    │
            │  └─────────────────────────┘    │
            └─────────────────────────────────┘
```

## 要件

### ハードウェア要件
- CPU: 4コア以上 (Intel Core i5相当)
- メモリ: 8GB以上
- ストレージ: 10GB以上の空き容量
- ネットワーク: WiFi対応 (複数ドローン接続用)

### ソフトウェア要件
- Docker 20.10+
- Docker Compose 2.0+
- Google Chrome 90+ (WebRTC対応ブラウザ)

### DJI Tello要件
- DJI Tello または Tello EDU
- 最新ファームウェア

## インストール

### 1. リポジトリのクローン

```bash
git checkout tello-monitor/natural-pug
cd grass_blue
```

### 2. Docker Composeでの起動

```bash
# 開発環境での起動
docker-compose up -d

# または本番環境でのビルド・起動
docker-compose up --build -d
```

### 3. Docker Swarmでの起動（本番環境推奨）

```bash
# デプロイスクリプトの実行
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4. アクセス

- **メインインターフェース**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **WebRTC Server**: http://localhost:8000

## 使用方法

### 1. ドローンの接続

1. DJI Telloの電源を入れる
2. PCのWiFiでTelloのアクセスポイントに接続
3. ブラウザでアプリケーションにアクセス
4. 「ドローンID」欄にドローン名を入力
5. 「接続」ボタンをクリック

### 2. 映像ストリーミング

1. 接続されたドローンカードの「ストリーム開始」をクリック
2. ライブ映像エリアに映像が表示される
3. FPSとレイテンシがリアルタイムで表示される

### 3. ドローン情報の確認

1. ドローンカードの「詳細」ボタンをクリック
2. モーダルウィンドウで詳細情報を確認
3. バッテリー、温度、高度、速度などを監視

### 4. 複数ドローンの管理

1. 複数のドローンを順次接続
2. 「全ストリーム開始」で一括ストリーミング開始
3. 各ドローンの映像を同時に監視

## API仕様

### REST API エンドポイント

#### ドローン一覧取得
```
GET /api/drones
Response: ["drone01", "drone02", ...]
```

#### ドローン接続
```
POST /api/drones/{drone_id}/connect
Body: { "ip_address": "192.168.10.1" }
Response: { "status": "success", "message": "..." }
```

#### ストリーム開始
```
POST /api/drones/{drone_id}/start_stream
Response: { "status": "success", "message": "..." }
```

#### ストリーム停止
```
POST /api/drones/{drone_id}/stop_stream
Response: { "status": "success", "message": "..." }
```

#### ドローン情報取得
```
GET /api/drones/{drone_id}/info
Response: {
  "drone_id": "drone01",
  "battery": 85,
  "temperature": 23,
  "height": 120,
  "speed": [0, 0, 0],
  "flight_time": 45,
  "wifi_signal": "-42dBm"
}
```

### WebSocket イベント

#### クライアント → サーバー
- `connect`: 接続時
- `request_drone_list`: ドローン一覧要求

#### サーバー → クライアント
- `connected`: 接続確認
- `drone_connected`: ドローン接続通知
- `drone_list`: ドローン一覧
- `video_frame`: 映像フレーム

## トラブルシューティング

### よくある問題

#### 1. ドローンに接続できない
- DJI TelloのWiFiアクセスポイントに接続されているか確認
- ファイアウォールでポート8889（制御）、8890（状態）がブロックされていないか確認
- 他のTelloアプリケーションが動作していないか確認

#### 2. 映像が表示されない
- Telloの映像ストリームが有効になっているか確認
- WebRTCがブラウザでサポートされているか確認
- ネットワーク帯域幅を確認

#### 3. レイテンシが高い
- WiFi接続品質を確認
- 他のネットワークトラフィックを最小化
- Docker環境のリソース使用量を確認

### ログの確認

```bash
# Docker Composeの場合
docker-compose logs -f tello-backend

# Docker Swarmの場合
docker service logs tello-monitor_tello-backend
```

## 開発者向け情報

### プロジェクト構造

```
grass_blue/
├── tello_app/
│   ├── backend/          # Python Flask バックエンド
│   │   ├── app.py        # メインアプリケーション
│   │   ├── Dockerfile    # バックエンド用Docker設定
│   │   └── requirements.txt
│   ├── frontend/         # HTML/CSS/JS フロントエンド
│   │   ├── index.html    # メインページ
│   │   ├── style.css     # スタイルシート
│   │   ├── app.js        # JavaScriptアプリケーション
│   │   ├── nginx.conf    # Nginx設定
│   │   └── Dockerfile    # フロントエンド用Docker設定
│   └── webrtc/          # WebRTC サーバー
│       ├── webrtc_server.py
│       ├── Dockerfile
│       └── requirements.txt
├── scripts/
│   └── deploy.sh        # デプロイスクリプト
├── docker-compose.yml   # 開発環境用
├── docker-swarm.yml     # 本番環境用
├── nginx-proxy.conf     # プロキシ設定
└── README.md           # このファイル
```

### 開発環境のセットアップ

```bash
# 開発用コンテナの起動
docker-compose -f docker-compose.yml up -d

# バックエンドの開発
cd tello_app/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py

# フロントエンドの開発
cd tello_app/frontend
# 静的ファイルを直接ブラウザで開く
```

### カスタマイズ

#### 新しいドローン機能の追加
1. `tello_app/backend/app.py`のTelloManagerクラスを拡張
2. 新しいAPIエンドポイントを追加
3. フロントエンドのJavaScriptで対応する機能を実装

#### UI/UXの改善
1. `tello_app/frontend/style.css`でスタイルを調整
2. `tello_app/frontend/app.js`でJavaScript機能を追加
3. `tello_app/frontend/index.html`でHTML構造を変更

### 貢献方法

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## サポート

問題や質問がある場合は、[Issues](https://github.com/your-repo/tello-monitor/issues)で報告してください。

---

**⚠️ 重要な注意事項**

- ドローンの飛行は各国の法律・規制に従って行ってください
- 屋外での飛行には適切な許可が必要な場合があります
- バッテリー残量を定期的に確認し、安全な飛行を心がけてください