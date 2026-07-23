$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = Join-Path $root 'apps\api\.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
  throw "Python executable not found at $python"
}

$process = Start-Process `
  -FilePath $python `
  -ArgumentList @('-m', 'http.server', '8200', '--bind', '0.0.0.0', '--directory', 'site') `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 1

if ($process.HasExited) {
  throw "Site preview server exited early with code $($process.ExitCode)."
}

Write-Host "Started TextPlex site preview server (PID $($process.Id))"
