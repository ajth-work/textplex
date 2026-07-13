@echo off
set PYTHONUTF8=1
pushd C:\Users\Andrew-John\Documents\TextPlex\apps\api
start "" /b cmd /c ""C:\Users\Andrew-John\Documents\TextPlex\apps\api\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8201 >> "C:\Users\Andrew-John\Documents\TextPlex\api-dev.log" 2>> "C:\Users\Andrew-John\Documents\TextPlex\api-dev.err""
popd
