# 🔄 Sequence Diagram (シーケンス図)

DJI Tello Multi-Drone Monitorの主要な処理フローをMermaidシーケンス図で表現します。

## 1. ドローン接続・初期化シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (Nginx)
    participant B as Backend (Flask)
    participant T as Tello Drone
    participant W as WebRTC Server
    
    Note over U,W: ドローン接続・初期化フロー
    
    U->>F: アクセス (http://localhost:8080)
    F->>U: index.html, CSS, JS配信
    
    U->>B: WebSocket接続要求
    B->>U: WebSocket接続確立
    B->>U: connected イベント送信
    
    U->>U: ドローンID入力 (drone01)
    U->>B: POST /api/drones/drone01/connect
    
    B->>T: UDP接続試行 (ポート8889)
    T->>B: 接続確認応答
    
    B->>T: battery? (バッテリー状態問い合わせ)
    T->>B: battery 85 (バッテリー85%応答)
    
    B->>T: temp? (温度問い合わせ)
    T->>B: temp 23 (温度23度応答)
    
    B->>U: HTTP 200 OK (接続成功)
    B->>U: drone_connected イベント (WebSocket)
    
    U->>B: request_drone_list イベント
    B->>U: drone_list イベント (ドローン情報配列)
    
    U->>U: ドローンカード表示更新
    
    Note over U,W: 接続完了 - 監視準備完了
```

## 2. 映像ストリーミング開始シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (Nginx)
    participant B as Backend (Flask)
    participant T as Tello Drone
    participant W as WebRTC Server
    
    Note over U,W: 映像ストリーミング開始フロー
    
    U->>B: POST /api/drones/drone01/start_stream
    
    B->>T: streamon (映像ストリーム開始コマンド)
    T->>B: ok (コマンド受信確認)
    
    B->>B: 映像キャプチャスレッド開始
    
    loop 映像キャプチャループ (30 FPS)
        T->>B: H.264 映像フレーム (UDP:11111)
        B->>B: フレーム受信・デコード
        B->>B: JPEG圧縮・Base64エンコード
        B->>U: video_frame イベント (WebSocket)
        
        U->>U: Canvas描画・表示更新
        U->>U: FPS・レイテンシ計算
    end
    
    B->>U: HTTP 200 OK (ストリーム開始成功)
    
    Note over U,W: リアルタイム映像配信中
```

## 3. WebRTC低レイテンシ配信シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant W as WebRTC Server
    participant B as Backend (Flask)
    participant T as Tello Drone
    
    Note over U,T: WebRTC P2P接続確立フロー
    
    U->>W: WebSocket接続 (ws://localhost:8000)
    W->>U: WebSocket接続確立
    
    U->>U: RTCPeerConnection作成
    U->>U: createOffer() 実行
    U->>W: Offer SDP送信 (JSON)
    
    W->>W: setRemoteDescription(offer)
    W->>W: 映像トラック追加
    W->>W: createAnswer() 実行
    W->>U: Answer SDP送信 (JSON)
    
    U->>U: setRemoteDescription(answer)
    
    par ICE候補交換
        U->>W: ICE Candidate送信
        W->>U: ICE Candidate送信
    end
    
    Note over U,W: P2P接続確立完了
    
    loop 低レイテンシ映像配信
        T->>B: 映像フレーム受信
        B->>W: フレームデータ転送
        W->>W: VideoFrame作成
        W->>U: WebRTC映像配信 (P2P)
        U->>U: video要素で再生
    end
    
    Note over U,T: 低遅延映像視聴中
```

## 4. テレメトリ監視シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant B as Backend (Flask)
    participant T as Tello Drone
    
    Note over U,T: テレメトリデータ継続監視
    
    loop テレメトリ監視ループ (10秒間隔)
        B->>T: battery? (バッテリー問い合わせ)
        T->>B: battery 82 (バッテリー82%応答)
        
        B->>T: temp? (温度問い合わせ)
        T->>B: temp 25 (温度25度応答)
        
        B->>T: height? (高度問い合わせ)
        T->>B: height 120 (高度120cm応答)
        
        B->>T: speed? (速度問い合わせ)
        T->>B: speed 0.0 0.0 0.0 (速度応答)
        
        B->>T: time? (飛行時間問い合わせ)
        T->>B: time 45 (飛行時間45秒応答)
        
        B->>B: テレメトリデータ更新
        B->>U: drone_telemetry_update イベント (WebSocket)
        
        U->>U: ドローンカード情報更新
        U->>U: バッテリーレベル色変更
    end
    
    Note over U,T: 継続的な状態監視
```

## 5. 複数ドローン同時管理シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant B as Backend (Flask)
    participant T1 as Tello Drone 1
    participant T2 as Tello Drone 2
    participant T3 as Tello Drone 3
    
    Note over U,T3: 複数ドローン一括管理フロー
    
    U->>B: 全ストリーム開始要求
    
    par 並列ストリーム開始
        B->>T1: streamon
        T1->>B: ok
        and
        B->>T2: streamon  
        T2->>B: ok
        and
        B->>T3: streamon
        T3->>B: ok
    end
    
    par 並列映像配信
        loop Drone 1 映像ループ
            T1->>B: 映像フレーム
            B->>U: video_frame (drone01)
        end
        and
        loop Drone 2 映像ループ
            T2->>B: 映像フレーム
            B->>U: video_frame (drone02)
        end
        and
        loop Drone 3 映像ループ
            T3->>B: 映像フレーム
            B->>U: video_frame (drone03)
        end
    end
    
    par 並列テレメトリ監視
        loop Drone 1 テレメトリ
            B->>T1: テレメトリ問い合わせ
            T1->>B: テレメトリ応答
        end
        and
        loop Drone 2 テレメトリ
            B->>T2: テレメトリ問い合わせ
            T2->>B: テレメトリ応答
        end
        and
        loop Drone 3 テレメトリ
            B->>T3: テレメトリ問い合わせ
            T3->>B: テレメトリ応答
        end
    end
    
    Note over U,T3: 複数ドローン同時監視中
```

## 6. エラー処理・復旧シーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant B as Backend (Flask)
    participant T as Tello Drone
    
    Note over U,T: エラー発生・復旧処理フロー
    
    B->>T: battery? (通常のテレメトリ問い合わせ)
    T--xB: 通信エラー (タイムアウト)
    
    B->>B: エラーログ記録
    B->>B: 再試行カウンター増加
    
    alt 再試行回数 < 3
        B->>T: 再接続試行
        T->>B: 接続確認応答
        B->>U: ドローン復旧通知 (WebSocket)
        U->>U: ドローンカード状態を正常に更新
    else 再試行回数 ≥ 3
        B->>B: ドローンを切断状態に変更
        B->>U: ドローン切断通知 (WebSocket)
        U->>U: ドローンカードをエラー状態に更新
        U->>U: エラー通知を表示
        
        opt ユーザーが再接続操作
            U->>B: POST /api/drones/drone01/connect
            B->>T: 再接続試行
            T->>B: 接続成功
            B->>U: 接続成功通知
            U->>U: ドローンカード状態を正常に復旧
        end
    end
    
    Note over U,T: エラー処理・復旧完了
```

## 7. システム終了・クリーンアップシーケンス

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (Nginx)
    participant B as Backend (Flask)
    participant T1 as Tello Drone 1
    participant T2 as Tello Drone 2
    participant W as WebRTC Server
    
    Note over U,W: システム終了・リソース解放フロー
    
    U->>B: 全ストリーム停止要求
    
    par 並列ストリーム停止
        B->>T1: streamoff
        T1->>B: ok
        and
        B->>T2: streamoff
        T2->>B: ok
    end
    
    B->>B: 映像キャプチャスレッド停止
    B->>B: テレメトリ監視停止
    
    U->>F: ページクローズ/リロード
    F->>B: WebSocket切断
    B->>B: セッション削除
    
    W->>W: WebRTC接続切断
    W->>W: リソース解放
    
    par ドローン切断処理
        B->>T1: end (接続終了)
        T1->>B: ok
        and
        B->>T2: end (接続終了)  
        T2->>B: ok
    end
    
    B->>B: 全ドローン管理リソース解放
    
    Note over U,W: システム正常終了完了
```

## シーケンス図の主要ポイント

### 🔄 非同期・並列処理
- 複数ドローンの同時制御
- 映像配信とテレメトリ監視の並列実行
- WebSocketとWebRTCの同時通信

### ⚡ リアルタイム性
- 30 FPS映像配信
- 10秒間隔テレメトリ更新
- WebRTCによる低レイテンシ通信

### 🛡️ エラー耐性
- 通信エラーの自動検出
- 再試行メカニズム
- ユーザーへの状態通知

### 🔧 リソース管理
- 適切な接続・切断処理
- メモリ・スレッドの適切な解放
- システム終了時のクリーンアップ

これらのシーケンス図は、システムの動作を理解し、デバッグ・トラブルシューティング・機能拡張の指針として活用されます。