# 2026-10-13 — Docker on the dev machine needs Virtual Machine Platform

Docker Desktop starts, but the API returns HTTP 500 because "Virtual Machine Platform not enabled / No virtualization available" (see `%LOCALAPPDATA%/Docker/log/host/com.docker.backend.exe.log`). It needs admin rights and a reboot to fix; the alternative is a hosted Postgres via `DATABASE_URL`.
