#!/bin/bash

# DJI Tello Monitor デプロイメントスクリプト

set -e

echo "🚁 DJI Tello Monitor デプロイメントを開始します..."

# Docker Swarmの初期化確認
if ! docker info | grep -q "Swarm: active"; then
    echo "Docker Swarmを初期化しています..."
    docker swarm init
fi

# イメージのビルド
echo "📦 Docker イメージをビルドしています..."

# Backend image
echo "Backend イメージをビルド中..."
docker build -t tello-monitor/backend:latest ./tello_app/backend/

# Frontend image
echo "Frontend イメージをビルド中..."
docker build -t tello-monitor/frontend:latest ./tello_app/frontend/

# WebRTC image
echo "WebRTC イメージをビルド中..."
docker build -t tello-monitor/webrtc:latest ./tello_app/webrtc/

# Stack のデプロイ
echo "🚀 Docker Stack をデプロイしています..."
docker stack deploy -c docker-swarm.yml tello-monitor

# サービス状態の確認
echo "📊 サービス状態を確認しています..."
docker stack services tello-monitor

echo "✅ デプロイメントが完了しました!"
echo ""
echo "🌐 アクセス先:"
echo "  - Frontend: http://localhost:8080"
echo "  - Backend API: http://localhost:5000"
echo "  - WebRTC Server: http://localhost:8000"
echo ""
echo "📋 管理コマンド:"
echo "  - サービス状態確認: docker stack services tello-monitor"
echo "  - ログ確認: docker service logs tello-monitor_<service-name>"
echo "  - スケール変更: docker service scale tello-monitor_<service-name>=<replicas>"
echo "  - スタック削除: docker stack rm tello-monitor"