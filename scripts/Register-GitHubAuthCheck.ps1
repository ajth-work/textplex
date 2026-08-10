[CmdletBinding()]
param(
    [string]$TaskName = "TextPlex GitHub Auth Check",
    [string]$Repo = "TextPlex/textplex",
    [string]$ProjectOwner = "ajth-work",
    [int]$ProjectNumber = 2,
    [ValidateSet("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")]
    [string]$DayOfWeek = "Sunday",
    [string]$At = "9:00 AM"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$checkScript = Join-Path $PSScriptRoot "Test-GitHubAuth.ps1"
$logPath = Join-Path $repoRoot "artifacts\github-auth\weekly.log"
$pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
if ($null -ne $pwshCommand) {
    $pwsh = $pwshCommand.Path
}
else {
    $pwsh = (Get-Command powershell.exe -ErrorAction Stop).Path
}

$arguments = @(
    "-NoLogo"
    "-NoProfile"
    "-NonInteractive"
    "-ExecutionPolicy"
    "Bypass"
    "-File"
    "`"$checkScript`""
    "-Repo"
    "`"$Repo`""
    "-ProjectOwner"
    "`"$ProjectOwner`""
    "-ProjectNumber"
    "$ProjectNumber"
    "-LogPath"
    "`"$logPath`""
) -join " "

$action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At ([DateTime]::Parse($At))
$principal = New-ScheduledTaskPrincipal `
    -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Checks TextPlex GitHub CLI authentication and repository/project access." `
    -Force | Out-Null

Write-Host "Registered '$TaskName' for $DayOfWeek at $At."
Write-Host "The task runs when this Windows user is logged in and writes to $logPath."
Write-Host "Run it now with: Start-ScheduledTask -TaskName '$TaskName'"
