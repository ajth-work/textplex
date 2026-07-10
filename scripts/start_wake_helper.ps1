$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Andrew-John\Documents\TextPlex'
$python = Join-Path $root 'apps\api\.venv\Scripts\python.exe'
$script = Join-Path $root 'scripts\wake_helper.py'
$log = Join-Path $root 'wake-helper.log'
$err = Join-Path $root 'wake-helper.err'

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $python
$startInfo.Arguments = "`"$script`" --host 0.0.0.0 --port 8787"
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

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

Start-Sleep -Seconds 1

if ($process.HasExited) {
    throw "Wake helper exited early with code $($process.ExitCode). See $log and $err."
}

Write-Host "Started TextPlex wake helper (PID $($process.Id))"
