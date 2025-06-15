/**
 * DJI Tello Multi-Drone Monitor Frontend Application
 * WebSocketとWebRTCを使用した映像監視アプリケーション
 */

class TelloMonitor {
    constructor() {
        this.socket = null;
        this.webrtcConnections = new Map();
        this.drones = new Map();
        this.videoElements = new Map();
        
        this.init();
    }
    
    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.setupModal();
    }
    
    // WebSocket接続
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.hostname}:5000`;
        
        this.socket = io(socketUrl);
        
        this.socket.on('connect', () => {
            console.log('WebSocket接続成功');
            this.updateConnectionStatus('connected');
            this.requestDroneList();
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocket接続切断');
            this.updateConnectionStatus('disconnected');
        });
        
        this.socket.on('drone_connected', (data) => {
            console.log(`ドローン接続: ${data.drone_id}`);
            this.requestDroneList();
        });
        
        this.socket.on('drone_list', (drones) => {
            this.updateDroneList(drones);
        });
        
        this.socket.on('video_frame', (data) => {
            this.handleVideoFrame(data);
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showNotification('エラーが発生しました: ' + error.message, 'error');
        });
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        // ドローン接続
        document.getElementById('connect-drone').addEventListener('click', () => {
            this.connectDrone();
        });
        
        // エンターキーでドローン接続
        document.getElementById('drone-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectDrone();
        });
        
        document.getElementById('drone-ip').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectDrone();
        });
        
        // バルク操作
        document.getElementById('start-all-streams').addEventListener('click', () => {
            this.startAllStreams();
        });
        
        document.getElementById('stop-all-streams').addEventListener('click', () => {
            this.stopAllStreams();
        });
        
        document.getElementById('refresh-drones').addEventListener('click', () => {
            this.requestDroneList();
        });
    }
    
    // モーダル設定
    setupModal() {
        const modal = document.getElementById('drone-modal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // 接続状態の更新
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        statusElement.className = status;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = '接続済み';
                break;
            case 'disconnected':
                statusElement.textContent = '切断';
                break;
            case 'connecting':
                statusElement.textContent = '接続中...';
                break;
        }
    }
    
    // ドローン接続
    async connectDrone() {
        const droneId = document.getElementById('drone-id').value.trim();
        const droneIp = document.getElementById('drone-ip').value.trim();
        
        if (!droneId) {
            this.showNotification('ドローンIDを入力してください', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/drones/${droneId}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ip_address: droneIp || null
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`ドローン ${droneId} が接続されました`, 'success');
                document.getElementById('drone-id').value = '';
                document.getElementById('drone-ip').value = '';
                this.requestDroneList();
            } else {
                this.showNotification(result.message, 'error');
            }
            
        } catch (error) {
            console.error('ドローン接続エラー:', error);
            this.showNotification('ドローン接続に失敗しました', 'error');
        }
    }
    
    // ドローンリストの要求
    requestDroneList() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('request_drone_list');
        }
    }
    
    // ドローンリストの更新
    updateDroneList(drones) {
        const droneCardsContainer = document.getElementById('drone-cards');
        droneCardsContainer.innerHTML = '';
        
        this.drones.clear();
        
        drones.forEach(drone => {
            this.drones.set(drone.drone_id, drone);
            const droneCard = this.createDroneCard(drone);
            droneCardsContainer.appendChild(droneCard);
        });
        
        if (drones.length === 0) {
            droneCardsContainer.innerHTML = '<p>接続されているドローンがありません</p>';
        }
    }
    
    // ドローンカードの作成
    createDroneCard(drone) {
        const card = document.createElement('div');
        card.className = 'drone-card fade-in';
        card.id = `drone-${drone.drone_id}`;
        
        const statusClass = drone.battery ? 'status-connected' : 'status-error';
        const batteryLevel = drone.battery || 0;
        const batteryColor = batteryLevel > 50 ? '#27ae60' : batteryLevel > 20 ? '#f39c12' : '#e74c3c';
        
        card.innerHTML = `
            <div class="drone-header">
                <div class="drone-id">${drone.drone_id}</div>
                <div class="drone-status ${statusClass}">
                    ${drone.battery ? '接続済み' : 'エラー'}
                </div>
            </div>
            <div class="drone-info">
                <div class="info-item">
                    <span class="info-label">バッテリー</span>
                    <span class="info-value" style="color: ${batteryColor}">
                        ${batteryLevel}%
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">温度</span>
                    <span class="info-value">${drone.temperature || 'N/A'}°C</span>
                </div>
                <div class="info-item">
                    <span class="info-label">高度</span>
                    <span class="info-value">${drone.height || 0}cm</span>
                </div>
                <div class="info-item">
                    <span class="info-label">飛行時間</span>
                    <span class="info-value">${drone.flight_time || 0}s</span>
                </div>
                <div class="info-item">
                    <span class="info-label">WiFi信号</span>
                    <span class="info-value">${drone.wifi_signal || 'N/A'}</span>
                </div>
            </div>
            <div class="drone-actions">
                <button class="btn-start" onclick="telloMonitor.startStream('${drone.drone_id}')">
                    ストリーム開始
                </button>
                <button class="btn-stop" onclick="telloMonitor.stopStream('${drone.drone_id}')">
                    ストリーム停止
                </button>
                <button class="btn-info" onclick="telloMonitor.showDroneDetails('${drone.drone_id}')">
                    詳細
                </button>
            </div>
        `;
        
        return card;
    }
    
    // ストリーム開始
    async startStream(droneId) {
        try {
            const response = await fetch(`/api/drones/${droneId}/start_stream`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`${droneId} のストリームを開始しました`, 'success');
                this.updateDroneCardStatus(droneId, 'streaming');
                this.createVideoPlayer(droneId);
            } else {
                this.showNotification(result.message, 'error');
            }
            
        } catch (error) {
            console.error('ストリーム開始エラー:', error);
            this.showNotification('ストリーム開始に失敗しました', 'error');
        }
    }
    
    // ストリーム停止
    async stopStream(droneId) {
        try {
            const response = await fetch(`/api/drones/${droneId}/stop_stream`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification(`${droneId} のストリームを停止しました`, 'success');
                this.updateDroneCardStatus(droneId, 'connected');
                this.removeVideoPlayer(droneId);
            }
            
        } catch (error) {
            console.error('ストリーム停止エラー:', error);
            this.showNotification('ストリーム停止に失敗しました', 'error');
        }
    }
    
    // 全ストリーム開始
    startAllStreams() {
        this.drones.forEach((drone, droneId) => {
            this.startStream(droneId);
        });
    }
    
    // 全ストリーム停止
    stopAllStreams() {
        this.drones.forEach((drone, droneId) => {
            this.stopStream(droneId);
        });
    }
    
    // ドローンカードのステータス更新
    updateDroneCardStatus(droneId, status) {
        const card = document.getElementById(`drone-${droneId}`);
        if (card) {
            card.className = `drone-card ${status}`;
            
            const statusElement = card.querySelector('.drone-status');
            if (statusElement) {
                statusElement.className = `drone-status status-${status}`;
                statusElement.textContent = status === 'streaming' ? 'ストリーミング中' : '接続済み';
            }
        }
    }
    
    // 映像プレイヤーの作成
    createVideoPlayer(droneId) {
        const videoContainer = document.getElementById('video-container');
        
        // 既存のプレイヤーがあれば削除
        this.removeVideoPlayer(droneId);
        
        const playerDiv = document.createElement('div');
        playerDiv.className = 'video-player fade-in';
        playerDiv.id = `video-${droneId}`;
        
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.id = `canvas-${droneId}`;
        
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        overlay.innerHTML = `
            <div class="video-title">${droneId}</div>
            <div class="video-stats">
                <span id="fps-${droneId}">0 FPS</span> | 
                <span id="latency-${droneId}">0ms</span>
            </div>
        `;
        
        playerDiv.appendChild(canvas);
        playerDiv.appendChild(overlay);
        videoContainer.appendChild(playerDiv);
        
        this.videoElements.set(droneId, canvas);
    }
    
    // 映像プレイヤーの削除
    removeVideoPlayer(droneId) {
        const player = document.getElementById(`video-${droneId}`);
        if (player) {
            player.remove();
        }
        this.videoElements.delete(droneId);
    }
    
    // 映像フレームの処理
    handleVideoFrame(data) {
        const { drone_id, frame, timestamp } = data;
        const canvas = this.videoElements.get(drone_id);
        
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // FPSとレイテンシの更新
                this.updateVideoStats(drone_id, timestamp);
            };
            
            img.src = 'data:image/jpeg;base64,' + frame;
        }
    }
    
    // 映像統計の更新
    updateVideoStats(droneId, timestamp) {
        const now = Date.now() / 1000;
        const latency = Math.round((now - timestamp) * 1000);
        
        const latencyElement = document.getElementById(`latency-${droneId}`);
        if (latencyElement) {
            latencyElement.textContent = `${latency}ms`;
        }
        
        // FPS計算（簡易版）
        if (!this.fpsCounters) this.fpsCounters = new Map();
        
        const counter = this.fpsCounters.get(droneId) || { frames: 0, lastTime: now };
        counter.frames++;
        
        if (now - counter.lastTime >= 1) {
            const fps = Math.round(counter.frames / (now - counter.lastTime));
            const fpsElement = document.getElementById(`fps-${droneId}`);
            if (fpsElement) {
                fpsElement.textContent = `${fps} FPS`;
            }
            
            counter.frames = 0;
            counter.lastTime = now;
        }
        
        this.fpsCounters.set(droneId, counter);
    }
    
    // ドローン詳細表示
    async showDroneDetails(droneId) {
        try {
            const response = await fetch(`/api/drones/${droneId}/info`);
            const droneInfo = await response.json();
            
            if (response.ok) {
                this.displayDroneModal(droneInfo);
            } else {
                this.showNotification('ドローン情報の取得に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('ドローン情報取得エラー:', error);
            this.showNotification('ドローン情報の取得に失敗しました', 'error');
        }
    }
    
    // ドローン詳細モーダル表示
    displayDroneModal(droneInfo) {
        const modal = document.getElementById('drone-modal');
        const detailsContainer = document.getElementById('drone-details');
        
        detailsContainer.innerHTML = `
            <h2>ドローン詳細情報: ${droneInfo.drone_id}</h2>
            <div class="drone-detail-grid">
                <div class="detail-item">
                    <strong>バッテリー残量:</strong> ${droneInfo.battery}%
                </div>
                <div class="detail-item">
                    <strong>温度:</strong> ${droneInfo.temperature}°C
                </div>
                <div class="detail-item">
                    <strong>現在高度:</strong> ${droneInfo.height}cm
                </div>
                <div class="detail-item">
                    <strong>飛行時間:</strong> ${droneInfo.flight_time}秒
                </div>
                <div class="detail-item">
                    <strong>WiFi信号強度:</strong> ${droneInfo.wifi_signal}
                </div>
                <div class="detail-item">
                    <strong>速度 (X/Y/Z):</strong> 
                    ${droneInfo.speed[0]}/${droneInfo.speed[1]}/${droneInfo.speed[2]} cm/s
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    // 通知表示
    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // スタイル設定
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '500',
            zIndex: '1001',
            minWidth: '300px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // タイプ別の色設定
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // アニメーション
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自動削除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

// アプリケーション初期化
const telloMonitor = new TelloMonitor();