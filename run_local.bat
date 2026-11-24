@echo off
title Groww AI Navigator - Local Runner
echo ==========================================================
echo Starting Groww AI Navigator Local Server...
echo ==========================================================

start "" http://localhost:3000

node server.js

pause
