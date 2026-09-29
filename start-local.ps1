# 音标乐园 · 一键本地预览
# 双击同目录的 start-local.bat 就会跑这个脚本。
# 为什么必须起服务器：课程内容是 8 个 JSON 文件，直接双击 index.html 打开时
# 浏览器会拦截本地文件读取（安全策略），课程就加载不出来。

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location -LiteralPath $PSScriptRoot

$port = 8080

# 本机在 wifi 里的地址，手机连同一个 wifi 就能用它打开
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
       Where-Object { $_.InterfaceAlias -like 'WLAN*' -or $_.InterfaceAlias -like 'Wi-Fi*' } |
       Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host "     音标乐园 IPA Land · 本地预览" -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "   电脑上打开：  " -NoNewline; Write-Host "http://localhost:$port" -ForegroundColor Cyan
if ($ip) {
  Write-Host "   手机上打开：  " -NoNewline; Write-Host "http://${ip}:$port" -ForegroundColor Cyan -NoNewline
  Write-Host "     (手机要连同一个 wifi)"
} else {
  Write-Host "   (没找到无线网地址；手机要用的话先连上 wifi，再重开这个窗口)" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "   手机上打开后，用浏览器菜单里的「添加到主屏幕」，"
Write-Host "   就会变成一个 App 图标，全屏使用、离线也能玩。"
Write-Host ""
Write-Host "   手机连不上？两个常见原因：" -ForegroundColor DarkGray
Write-Host "     1. 首次运行时 Windows 弹「安全警报」要点「允许访问」（专用网络）" -ForegroundColor DarkGray
Write-Host "     2. 电脑开着代理/加速器时，局域网访问会被绕走，关掉再试" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   关掉服务器：直接关这个窗口，或按 Ctrl+C" -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host ""

Start-Process "http://localhost:$port"

if (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server $port
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  py -3 -m http.server $port
} else {
  Write-Host "   没找到 python，改用 npx serve…" -ForegroundColor DarkGray
  npx --yes serve -l $port .
}
