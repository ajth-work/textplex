@echo off
set PYTHONUTF8=1
pushd C:\Users\Andrew-John\Documents\TextPlex
start "" /b cmd /c ""C:\Users\Andrew-John\Documents\TextPlex\apps\api\.venv\Scripts\python.exe" "C:\Users\Andrew-John\Documents\TextPlex\scripts\wake_helper.py" --host 0.0.0.0 --port 8787 >> "C:\Users\Andrew-John\Documents\TextPlex\wake-helper.log" 2>> "C:\Users\Andrew-John\Documents\TextPlex\wake-helper.err""
popd
