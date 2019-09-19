#!/bin/bash
WORK_PATH='/usr/projects/vue-phone-gitee'
cd $WORK_PATH
echo "先清除老代码"
git reset --hard origin/master
git clean -f
echo "拉取最新代码"
git pull origin master
echo "编译"
npm i
npm run build
echo "开始执行构建"
docker build -t vue-phone-gitee:1.0 .
echo "停止旧容器并删除旧容器"
docker stop vue-phone-gitee-container
docker rm vue-phone-gitee-container
echo "启动新容器"
docker container run -p 3000:80  --name vue-phone-gitee-container -d vue-phone-gitee:1.0