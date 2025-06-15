# 📦 使用ライブラリ・ツールバージョン情報

## コア技術スタック

### 🐳 コンテナ・オーケストレーション
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Docker Swarm**: Docker内蔵

### 🌐 Webサーバー・プロキシ
- **Nginx**: 1.21-alpine
- **HTTP Server**: 1.0.2 (Node.js global package)

## バックエンド (Python)

### 🐍 Python Runtime
- **Python**: 3.11-slim (Docker base image)

### 📡 通信・ネットワーキング
- **djitellopy**: 2.5.0 - DJI Tellogライブラリ
- **flask**: 2.3.3 - Webフレームワーク
- **flask-socketio**: 5.3.6 - WebSocket通信
- **python-socketio**: 5.8.0 - Socket.IOクライアント
- **eventlet**: 0.33.3 - 非同期Webサーバー
- **websockets**: 11.0.3 - WebSocket実装

### 🎥 映像処理・WebRTC
- **opencv-python**: 4.8.1.78 - 画像・映像処理
- **aiortc**: 1.6.0 - Python WebRTC実装
- **numpy**: 1.24.3 - 数値計算ライブラリ

### 🎬 メディア処理
- **FFmpeg**: システムパッケージ (Debian bookworm)
  - libavcodec-dev
  - libavformat-dev
  - libavdevice-dev
  - libavfilter-dev
  - libswscale-dev
  - libswresample-dev
  - libopus-dev
  - libvpx-dev

## フロントエンド

### 🌐 JavaScript Runtime
- **Node.js**: 18+ (システムパッケージ)
- **npm**: 8+ (Node.js付属)

### 📡 通信ライブラリ
- **Socket.IO Client**: 4.7.2 (CDN)

### 🎨 UI/UX
- **HTML5**: Canvas API, MediaStream API
- **CSS3**: Grid, Flexbox, CSS Variables
- **JavaScript (ES6+)**: Async/Await, Classes, Modules

### 🎥 WebRTC
- **WebRTC API**: ブラウザネイティブ実装
- **MediaStream API**: ブラウザネイティブ実装

## 開発・ビルドツール

### 🛠️ システムツール
- **Git**: 2.34+ (バージョン管理)
- **Bash**: 5.1+ (スクリプト実行)
- **curl**: 7.81+ (HTTP通信)
- **wget**: 1.21+ (ファイルダウンロード)

### 📦 パッケージマネージャー
- **apt**: Debian標準パッケージマネージャー
- **pip**: Python パッケージマネージャー
- **npm**: Node.js パッケージマネージャー

## WebRTCサーバー

### 🐍 Python Runtime
- **Python**: 3.11-slim

### 🎥 WebRTC・映像処理
- **aiortc**: 1.6.0 - Python WebRTC サーバー実装
- **websockets**: 11.0.3 - WebSocket サーバー
- **opencv-python**: 4.8.1.78 - 映像処理
- **numpy**: 1.24.3 - 数値計算

### 🎬 メディアコーデック
- **FFmpeg**: システムレベル
- **libopus**: 音声コーデック
- **libvpx**: 映像コーデック (VP8/VP9)

## ブラウザ互換性

### 🌐 推奨ブラウザ
- **Google Chrome**: 90+
- **Mozilla Firefox**: 88+
- **Microsoft Edge**: 90+
- **Safari**: 14+

### 🎥 WebRTC対応
- **getUserMedia API**: カメラ・マイクアクセス
- **RTCPeerConnection**: P2P通信
- **WebSocket API**: リアルタイム通信

## DJI Tello SDK

### 🚁 ドローン通信
- **UDP Protocol**: ポート8889 (制御)、8890 (状態)
- **Video Stream**: UDP ポート11111
- **WiFi**: 2.4GHz 802.11n

### 📡 通信仕様
- **Command API**: Tello SDK 2.0準拠
- **State API**: 10Hz更新レート
- **Video API**: H.264ストリーム

## パフォーマンス・リソース要件

### 💻 システムリソース
- **CPU**: 4コア以上 (Intel Core i5相当)
- **メモリ**: 8GB以上
- **ネットワーク**: WiFi 802.11n以上
- **帯域幅**: 1Mbps/ドローン (映像ストリーム)

### 🐳 Dockerコンテナリソース
- **Backend**: 256MB-512MB RAM
- **Frontend**: 64MB-128MB RAM
- **WebRTC Server**: 128MB-256MB RAM
- **Nginx Proxy**: 32MB-64MB RAM

## セキュリティ・暗号化

### 🔒 通信セキュリティ
- **HTTPS**: TLS 1.2+対応（オプション）
- **WebSocket Secure**: WSS対応（オプション）
- **CORS**: Cross-Origin Resource Sharing制御

### 🛡️ コンテナセキュリティ
- **Non-root User**: コンテナ内非特権実行
- **Resource Limits**: メモリ・CPU制限
- **Health Checks**: コンテナヘルスチェック

## 更新履歴

### Version 1.0.0 (2024-12-15)
- 初期リリース
- 基本的なマルチドローン監視機能
- WebRTC低レイテンシ映像配信
- Docker/Docker Compose対応

---

**📝 注意事項**

- バージョン情報は定期的に更新されます
- セキュリティアップデートは適宜適用してください
- 新しいDJI Telloファームウェアとの互換性を確認してください