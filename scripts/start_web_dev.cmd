@echo off
set NEXT_IGNORE_INCORRECT_LOCKFILE=1
pushd C:\Users\Andrew-John\Documents\TextPlex\apps\web
"C:\Users\Andrew-John\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\next\dist\bin\next dev --hostname 0.0.0.0 --port 3000 >> "C:\Users\Andrew-John\Documents\TextPlex\web-dev.log" 2>> "C:\Users\Andrew-John\Documents\TextPlex\web-dev.err"
popd
