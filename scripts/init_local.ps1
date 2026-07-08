$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$booksDir = Join-Path $root "data\books"
$userDir = Join-Path $root "data\user"
$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"

New-Item -ItemType Directory -Force -Path $booksDir | Out-Null
New-Item -ItemType Directory -Force -Path $userDir | Out-Null

if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath $envExample -Destination $envFile
    Write-Host "Created .env from .env.example"
} else {
    Write-Host ".env already exists; leaving it unchanged"
}

Write-Host "Local directories initialized."
