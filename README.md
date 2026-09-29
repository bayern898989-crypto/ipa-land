# 音标乐园 · IPA Land

一个面向英语初学者的交互式音标学习网页。包含 48 个音标、8 个单元、逐课练习、拼写分拣游戏、懒音侦探和错题本。

**在线体验：** https://ipa-land.pages.dev/

## 手机使用

用 iPhone Safari 或安卓 Chrome 打开在线地址，选择“添加到主屏幕”。桌面图标是橙底“音”字。语音播放依赖手机浏览器的语音合成功能；微信内置浏览器的表现可能不同。

## 本地运行

不要直接双击 index.html，因为浏览器会阻止从本地文件读取课程 JSON。

- Windows：双击 start-local.bat。
- 其他系统：在本目录启动静态文件服务器，例如运行 python -m http.server 8080，然后访问 http://localhost:8080/。

## 项目结构

- content-batch-*.json：课程内容。
- index.html、lesson.html：课程地图与逐课页面。
- game-sorting.html、game-schwa.html：特别关。
- wrongbook.html：错题本。
- js/：课程渲染、语音和本地学习记录。
- manifest.json、sw.js、icons/：安装到主屏幕和离线缓存。
- build.sh：生成 Cloudflare Pages 使用的 dist/ 目录。

学习进度只保存在当前浏览器。更换浏览器、清除网站数据或使用无痕模式会丢失进度。当前网站没有账号系统。

## 部署

项目目前托管于 Cloudflare Pages。修改源码后运行 build.sh，再将生成的 dist/ 部署到 Pages。仓库本身仅用于代码管理，不会自动更新线上网站。

## 字体

项目内置的 Baloo 2 与 Fredoka 字体遵循 SIL Open Font License 1.1。对应许可文本见 fonts/OFL-Baloo2.txt 和 fonts/OFL-Fredoka.txt。
