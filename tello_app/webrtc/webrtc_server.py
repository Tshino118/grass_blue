#!/usr/bin/env python3
"""
WebRTC Server for DJI Tello Video Streaming
低レイテンシ映像配信のためのWebRTCサーバー
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from typing import Dict, Set
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaPlayer, MediaRelay
import cv2
import numpy as np
from threading import Thread
import queue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelloVideoTrack(VideoStreamTrack):
    """Telloからの映像をWebRTCで配信するためのVideoTrack"""
    
    def __init__(self, drone_id: str):
        super().__init__()
        self.drone_id = drone_id
        self.frame_queue = queue.Queue(maxsize=10)
        self.running = True
        
    async def recv(self):
        """フレームを受信して返す"""
        try:
            if not self.frame_queue.empty():
                frame_data = self.frame_queue.get_nowait()
                # OpenCVでフレームをデコード
                nparr = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    # BGRからRGBに変換
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    # aiortcのVideoFrameに変換
                    from aiortc import VideoFrame
                    av_frame = VideoFrame.from_ndarray(frame, format="rgb24")
                    av_frame.pts = self.frame_queue.qsize()
                    av_frame.time_base = 1/30  # 30 FPS
                    return av_frame
        except Exception as e:
            logger.error(f"Error in recv for drone {self.drone_id}: {e}")
        
        # デフォルトの黒いフレームを返す
        from aiortc import VideoFrame
        black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        av_frame = VideoFrame.from_ndarray(black_frame, format="rgb24")
        av_frame.pts = int(time.time() * 30)
        av_frame.time_base = 1/30
        return av_frame
    
    def add_frame(self, frame_data: bytes):
        """新しいフレームを追加"""
        if self.frame_queue.full():
            try:
                self.frame_queue.get_nowait()  # 古いフレームを削除
            except queue.Empty:
                pass
        self.frame_queue.put(frame_data)

class WebRTCServer:
    """WebRTCサーバークラス"""
    
    def __init__(self):
        self.peer_connections: Set[RTCPeerConnection] = set()
        self.video_tracks: Dict[str, TelloVideoTrack] = {}
        self.relay = MediaRelay()
        
    def create_video_track(self, drone_id: str) -> TelloVideoTrack:
        """指定されたドローン用のビデオトラックを作成"""
        if drone_id not in self.video_tracks:
            self.video_tracks[drone_id] = TelloVideoTrack(drone_id)
        return self.video_tracks[drone_id]
    
    def add_frame_to_track(self, drone_id: str, frame_data: bytes):
        """トラックにフレームを追加"""
        if drone_id in self.video_tracks:
            self.video_tracks[drone_id].add_frame(frame_data)
    
    async def handle_offer(self, pc: RTCPeerConnection, offer_data: dict):
        """WebRTCオファーを処理"""
        try:
            # オファーを設定
            offer = RTCSessionDescription(sdp=offer_data["sdp"], type=offer_data["type"])
            await pc.setRemoteDescription(offer)
            
            # 映像トラックを追加
            drone_id = offer_data.get("drone_id", "default")
            video_track = self.create_video_track(drone_id)
            pc.addTrack(video_track)
            
            # アンサーを作成
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            return {
                "type": answer.type,
                "sdp": answer.sdp
            }
            
        except Exception as e:
            logger.error(f"Error handling offer: {e}")
            return None
    
    async def handle_ice_candidate(self, pc: RTCPeerConnection, candidate_data: dict):
        """ICE Candidateを処理"""
        try:
            from aiortc import RTCIceCandidate
            candidate = RTCIceCandidate(
                component=candidate_data["component"],
                foundation=candidate_data["foundation"],
                ip=candidate_data["ip"],
                port=candidate_data["port"],
                priority=candidate_data["priority"],
                protocol=candidate_data["protocol"],
                type=candidate_data["type"]
            )
            await pc.addIceCandidate(candidate)
            
        except Exception as e:
            logger.error(f"Error handling ICE candidate: {e}")

# グローバルWebRTCサーバーインスタンス
webrtc_server = WebRTCServer()

async def handle_websocket(websocket, path):
    """WebSocket接続を処理"""
    logger.info(f"New WebSocket connection: {path}")
    
    pc = RTCPeerConnection()
    webrtc_server.peer_connections.add(pc)
    
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "closed":
            webrtc_server.peer_connections.discard(pc)
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get("type")
                
                if message_type == "offer":
                    answer = await webrtc_server.handle_offer(pc, data)
                    if answer:
                        await websocket.send(json.dumps(answer))
                        
                elif message_type == "ice-candidate":
                    await webrtc_server.handle_ice_candidate(pc, data)
                    
                elif message_type == "frame":
                    # バックエンドから受信したフレームをトラックに追加
                    drone_id = data.get("drone_id")
                    frame_data = data.get("frame_data")
                    if drone_id and frame_data:
                        import base64
                        frame_bytes = base64.b64decode(frame_data)
                        webrtc_server.add_frame_to_track(drone_id, frame_bytes)
                        
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")
    finally:
        webrtc_server.peer_connections.discard(pc)
        await pc.close()

async def main():
    """メイン関数"""
    logger.info("Starting WebRTC Server on port 8000...")
    
    # WebSocketサーバーを開始
    start_server = websockets.serve(handle_websocket, "0.0.0.0", 8000)
    
    await start_server
    logger.info("WebRTC Server started successfully")
    
    # サーバーを永続実行
    await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("WebRTC Server shutting down...")