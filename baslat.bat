@echo off
cd /d "C:\Users\Alagros\Desktop\devoteam-servis-project"

:: 1. Özel API Sunucusunu Başlat (server.js - Port 4001)
start /B node server.js

:: 2. React uygulamasını yayınla (Port 4000)
start /B npx serve -s dist -l 4000
