[CmdletBinding()]
param(
    [string]$Repo = "ajth-work/textplex",
    [string]$ProjectOwner = "ajth-work",
    [int]$ProjectNumber = 2,
    [string]$LogPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$results = [System.Collections.Generic.List[string]]::new()

function Add-Result {
    param(
        [string]$Message,
        [ValidateSet("PASS", "FAIL")]
        [string]$Status = "PASS"
    )

    $line = "[{0}] {1} {2}" -f (Get-Date -Format "s"), $Status, $Message
    $results.Add($line)
    Write-Host $line
}

function Invoke-GitHubCli {
    param([string[]]$Arguments)

    $output = (& gh @Arguments 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw ($output -replace "\s+", " ")
    }

    return $output
}

try {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) is not installed or is not on PATH."
    }

    $ghVersion = (gh --version | Select-Object -First 1).Trim()
    Add-Result $ghVersion

    Invoke-GitHubCli @("auth", "status", "--active", "--hostname", "github.com") | Out-Null
    Add-Result "GitHub CLI authentication is valid for github.com."

    $user = Invoke-GitHubCli @("api", "user", "--hostname", "github.com", "--jq", ".login")
    Add-Result "Authenticated account: $user"

    $repoJson = Invoke-GitHubCli @("repo", "view", $Repo, "--json", "nameWithOwner,viewerPermission,defaultBranchRef")
    $repoInfo = $repoJson | ConvertFrom-Json
    if ($repoInfo.nameWithOwner -ne $Repo) {
        throw "The authenticated account resolved the wrong repository: $($repoInfo.nameWithOwner)."
    }

    $permission = [string]$repoInfo.viewerPermission
    if ($permission -notin @("READ", "TRIAGE", "WRITE", "MAINTAIN", "ADMIN", "read", "triage", "write", "maintain", "admin")) {
        throw "Repository access is not usable: viewer permission '$permission'."
    }

    Add-Result "Repository access: $Repo ($permission)."
    Invoke-GitHubCli @("issue", "list", "--repo", $Repo, "--limit", "1", "--json", "number") | Out-Null
    Add-Result "Issue access is working."

    Invoke-GitHubCli @("pr", "list", "--repo", $Repo, "--limit", "1", "--json", "number") | Out-Null
    Add-Result "Pull request access is working."

    Invoke-GitHubCli @("run", "list", "--repo", $Repo, "--limit", "1", "--json", "databaseId") | Out-Null
    Add-Result "Actions run access is working."

    if ($ProjectNumber -gt 0 -and -not [string]::IsNullOrWhiteSpace($ProjectOwner)) {
        Invoke-GitHubCli @("project", "view", "$ProjectNumber", "--owner", $ProjectOwner) | Out-Null
        Add-Result "Project access is working: $ProjectOwner project #$ProjectNumber."
    }

    Add-Result "TextPlex GitHub authentication checks passed."
}
catch {
    Add-Result $_.Exception.Message "FAIL"
    Add-Result "Re-authenticate with: gh auth login --hostname github.com --web --git-protocol https --scopes repo,read:org,project,workflow,gist" "FAIL"
    exit 1
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
        if ([System.IO.Path]::IsPathRooted($LogPath)) {
            $resolvedLogPath = $LogPath
        }
        else {
            $resolvedLogPath = Join-Path (Get-Location).Path $LogPath
        }
        $logDirectory = Split-Path -Parent $resolvedLogPath
        if (-not [string]::IsNullOrWhiteSpace($logDirectory)) {
            New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        }

        Add-Content -LiteralPath $resolvedLogPath -Value ($results -join [Environment]::NewLine)
    }
}
