$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$log = Join-Path $root 'web-dev.log'
$err = Join-Path $root 'web-dev.err'

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $npm
$startInfo.Arguments = 'run dev:web'
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.EnvironmentVariables['NEXT_IGNORE_INCORRECT_LOCKFILE'] = '1'

$process = [System.Diagnostics.Process]::Start($startInfo)

$stdout = [System.IO.StreamWriter]::new($log, $true)
$stderr = [System.IO.StreamWriter]::new($err, $true)
$stdout.AutoFlush = $true
$stderr.AutoFlush = $true

$process.add_OutputDataReceived({
    param($sender, $eventArgs)
    if ($eventArgs.Data) {
        $stdout.WriteLine($eventArgs.Data)
    }
})

$process.add_ErrorDataReceived({
    param($sender, $eventArgs)
    if ($eventArgs.Data) {
        $stderr.WriteLine($eventArgs.Data)
    }
})

$process.BeginOutputReadLine()
$process.BeginErrorReadLine()

Start-Sleep -Seconds 2

if ($process.HasExited) {
    throw "Next exited early with code $($process.ExitCode). See $log and $err."
}

Write-Host "Started Next dev server (PID $($process.Id))"
