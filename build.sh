#!/usr/bin/env bash
# 打包出要上线的文件到 dist/
# 只放孩子端真正用得到的东西：PRD、质检脚本、原始手写模板都不上公网。
set -e
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist
cp index.html lesson.html wrongbook.html game-sorting.html game-schwa.html game-ea-sorting.html dist/
cp manifest.json sw.js _headers favicon.ico dist/
cp content-batch-*.json dist/
cp -r css js fonts icons dist/
echo "dist/ 已生成："
find dist -type f | wc -l | xargs echo "  文件数:"
du -sh dist | awk '{print "  体积: " $1}'
