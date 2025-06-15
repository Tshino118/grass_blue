#!/usr/bin/env python3
"""
DJI Tello Multi-Drone Monitor Backend
複数台のDJI Telloからの映像を受信し、WebRTC経由で配信するバックエンドサーバー
"""

import asyncio
import cv2
import json
import logging
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from djitellopy import Tello
import threading
import time
import base64
import numpy as np
from typing import Dict, List
import queue

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'tello-monitor-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

class TelloManager:
    """複数のTelloドローンを管理するクラス"""
    
    def __init__(self):
        self.drones: Dict[str, Tello] = {}
        self.drone_threads: Dict[str, threading.Thread] = {}
        self.video_queues: Dict[str, queue.Queue] = {}
        self.active_streams: Dict[str, bool] = {}
        
    def add_drone(self, drone_id: str, ip_address: str = None) -> bool:
        """新しいドローンを追加"""
        try:
            tello = Tello(host=ip_address) if ip_address else Tello()
            tello.connect()
            
            # バッテリーレベルをチェック
            battery = tello.get_battery()
            logger.info(f"Drone {drone_id} connected. Battery: {battery}%")
            
            self.drones[drone_id] = tello
            self.video_queues[drone_id] = queue.Queue(maxsize=30)
            self.active_streams[drone_id] = False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect drone {drone_id}: {e}")
            return False
    
    def start_video_stream(self, drone_id: str) -> bool:
        """指定されたドローンの映像ストリームを開始"""
        if drone_id not in self.drones:
            logger.error(f"Drone {drone_id} not found")
            return False
            
        try:
            drone = self.drones[drone_id]
            drone.streamon()
            
            self.active_streams[drone_id] = True
            
            # 映像キャプチャスレッドを開始
            thread = threading.Thread(
                target=self._video_capture_loop, 
                args=(drone_id,),
                daemon=True
            )
            thread.start()
            self.drone_threads[drone_id] = thread
            
            logger.info(f"Video stream started for drone {drone_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start video stream for drone {drone_id}: {e}")
            return False
    
    def _video_capture_loop(self, drone_id: str):
        """映像キャプチャループ"""
        drone = self.drones[drone_id]
        video_queue = self.video_queues[drone_id]
        
        while self.active_streams.get(drone_id, False):
            try:
                frame = drone.get_frame_read().frame
                if frame is not None:
                    # フレームを圧縮
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    
                    # キューがフルの場合は古いフレームを削除
                    if video_queue.full():
                        try:
                            video_queue.get_nowait()
                        except queue.Empty:
                            pass
                    
                    # 新しいフレームを追加
                    video_queue.put(buffer.tobytes())
                    
                    # WebSocketで配信
                    encoded_frame = base64.b64encode(buffer).decode('utf-8')
                    socketio.emit('video_frame', {
                        'drone_id': drone_id,
                        'frame': encoded_frame,
                        'timestamp': time.time()
                    })
                    
            except Exception as e:
                logger.error(f"Error in video capture loop for drone {drone_id}: {e}")
                break
                
            time.sleep(1/30)  # 30 FPS
    
    def stop_video_stream(self, drone_id: str):
        """映像ストリームを停止"""
        if drone_id in self.active_streams:
            self.active_streams[drone_id] = False
            
        if drone_id in self.drones:
            try:
                self.drones[drone_id].streamoff()
            except Exception as e:
                logger.error(f"Error stopping stream for drone {drone_id}: {e}")
    
    def get_drone_info(self, drone_id: str) -> Dict:
        """ドローンの情報を取得"""
        if drone_id not in self.drones:
            return None
            
        try:
            drone = self.drones[drone_id]
            return {
                'drone_id': drone_id,
                'battery': drone.get_battery(),
                'temperature': drone.get_temperature(),
                'height': drone.get_height(),
                'speed': [drone.get_speed_x(), drone.get_speed_y(), drone.get_speed_z()],
                'flight_time': drone.get_flight_time(),
                'wifi_signal': drone.query_wifi_signal_noise_ratio()
            }
        except Exception as e:
            logger.error(f"Error getting info for drone {drone_id}: {e}")
            return None
    
    def disconnect_all(self):
        """すべてのドローンを切断"""
        for drone_id in list(self.drones.keys()):
            self.stop_video_stream(drone_id)
            try:
                self.drones[drone_id].end()
            except Exception as e:
                logger.error(f"Error disconnecting drone {drone_id}: {e}")
        
        self.drones.clear()
        self.drone_threads.clear()
        self.video_queues.clear()
        self.active_streams.clear()

# グローバルTelloマネージャー
tello_manager = TelloManager()

@app.route('/api/drones', methods=['GET'])
def get_drones():
    """接続されているドローンのリストを取得"""
    return jsonify(list(tello_manager.drones.keys()))

@app.route('/api/drones/<drone_id>/connect', methods=['POST'])
def connect_drone(drone_id):
    """ドローンに接続"""
    data = request.get_json() or {}
    ip_address = data.get('ip_address')
    
    success = tello_manager.add_drone(drone_id, ip_address)
    
    if success:
        socketio.emit('drone_connected', {'drone_id': drone_id})
        return jsonify({'status': 'success', 'message': f'Drone {drone_id} connected'})
    else:
        return jsonify({'status': 'error', 'message': f'Failed to connect drone {drone_id}'}), 400

@app.route('/api/drones/<drone_id>/start_stream', methods=['POST'])
def start_stream(drone_id):
    """映像ストリームを開始"""
    success = tello_manager.start_video_stream(drone_id)
    
    if success:
        return jsonify({'status': 'success', 'message': f'Stream started for drone {drone_id}'})
    else:
        return jsonify({'status': 'error', 'message': f'Failed to start stream for drone {drone_id}'}), 400

@app.route('/api/drones/<drone_id>/stop_stream', methods=['POST'])
def stop_stream(drone_id):
    """映像ストリームを停止"""
    tello_manager.stop_video_stream(drone_id)
    return jsonify({'status': 'success', 'message': f'Stream stopped for drone {drone_id}'})

@app.route('/api/drones/<drone_id>/info', methods=['GET'])
def get_drone_info(drone_id):
    """ドローンの詳細情報を取得"""
    info = tello_manager.get_drone_info(drone_id)
    
    if info:
        return jsonify(info)
    else:
        return jsonify({'status': 'error', 'message': f'Drone {drone_id} not found'}), 404

@socketio.on('connect')
def handle_connect():
    """WebSocket接続時の処理"""
    logger.info('Client connected')
    emit('connected', {'status': 'Connected to Tello Monitor'})

@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket切断時の処理"""
    logger.info('Client disconnected')

@socketio.on('request_drone_list')
def handle_drone_list_request():
    """ドローンリストの要求"""
    drone_list = []
    for drone_id in tello_manager.drones.keys():
        info = tello_manager.get_drone_info(drone_id)
        if info:
            drone_list.append(info)
    
    emit('drone_list', drone_list)

if __name__ == '__main__':
    try:
        logger.info("Starting Tello Monitor Backend Server...")
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        tello_manager.disconnect_all()