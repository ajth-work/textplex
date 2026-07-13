$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Andrew-John\Documents\TextPlex'
$python = Join-Path $root 'apps\api\.venv\Scripts\python.exe'
$apiRoot = Join-Path $root 'apps\api'

if (-not (Test-Path $python)) {
  throw "Python executable not found at $python"
}

$process = Start-Process `
  -FilePath $python `
  -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8201') `
  -WorkingDirectory $apiRoot `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 2

if ($process.HasExited) {
  throw "API dev server exited early with code $($process.ExitCode)."
}

Write-Host "Started TextPlex API dev server (PID $($process.Id))"
