FROM nginx:alpine

# 静的ファイルをコピー
COPY . /usr/share/nginx/html/

# Nginxの設定ファイルをコピー
COPY nginx.conf /etc/nginx/nginx.conf

# ポート8080を公開
EXPOSE 8080

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]