@echo off
chcp 65001 >nul
title PsyTrance Engine
cd /d "%~dp0"

echo [1/3] 清理后台残留进程...
rem 找到占用 5173 端口（Vite 开发服务器）的进程并结束，没有则跳过
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    echo     结束进程 PID %%P（占用 5173 端口）
    taskkill /F /PID %%P >nul 2>&1
)
if "%FOUND%"=="0" echo     无残留进程，跳过

echo [2/3] 启动开发服务器...
start "PsyTrance Dev Server" cmd /c "npm run dev"

echo [3/3] 等待服务器就绪并打开浏览器...
:wait
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:5173/ 2>nul
if errorlevel 1 goto wait

start http://localhost:5173/
echo 已启动: http://localhost:5173/ （关闭弹出的服务器窗口即可停止）
timeout /t 2 >nul
