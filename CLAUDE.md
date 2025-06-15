ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.

DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.

You MUST inform the user how to view your work using `git checkout <branch_name>`. Failure to do this will make your work inaccessible to others.


DJI Tello向けのPC用アプリケーションを作成してください。
主な目的は複数台のDJITelloデバイスからの映像を低レイテンシで通信を受信しWEBブラウザ上で監視することです｡

使用するツールは以下の通りです｡
- Docker
- Docker-compose
- Docker-swarm
- ffmpeg
    - Webrtc
- Python
    - djitellopy
- Google Chrome

アプリケーションの解説はREADME.mdに記載してください。
使用したライブラリのバージョンはVERSIONS.mdに記載してください。
E-R図、シーケンス図をMarmaidを利用して作成し､ER-D.md, SEQENCE.mdに記載してください。
Gitignoreファイル､Dockerignoreファイルを追加し､プライベートな設定がGithubにプッシュされないようにしてください｡
README.md, VERSIONS.md, ER-D.md, SEQ-D.mdに対して@を利用して参照可能にしてください。