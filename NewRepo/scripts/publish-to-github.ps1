# Create github.com/RbbSukhRkhe1/CAP-DONATE (or your logged-in user) and push main.
# Option A — GitHub CLI (interactive once):  gh auth login
#   .\scripts\publish-to-github.ps1 -UseGh
# Option B — token: classic PAT with "repo" scope (do not commit the token)
#   $env:GITHUB_TOKEN = 'ghp_...'
#   .\scripts\publish-to-github.ps1

param(
    [string]$RepoName = "CAP-DONATE",
    [string]$Description = "Web3 donation capstone with Anvil, SQLite API, and React",
    [switch]$UseGh
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$gh = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"

function Invoke-CreateRepoApi {
    $token = $env:GITHUB_TOKEN
    if (-not $token) { $token = $env:GH_TOKEN }
    if (-not $token) {
        throw "Set GITHUB_TOKEN or GH_TOKEN, or use -UseGh after running: gh auth login"
    }
    $headers = @{
        Authorization        = "Bearer $token"
        Accept               = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $body = @{
        name        = $RepoName
        description = $Description
        private     = $false
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post `
            -Headers $headers -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
        Write-Host "Created repository: $RepoName"
    }
    catch {
        $code = $null
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
        if ($code -eq 422) {
            Write-Host "Repo '$RepoName' may already exist (422). Attempting push anyway."
        }
        else {
            throw
        }
    }
}

Push-Location $repoRoot
try {
    if ($UseGh) {
        if (-not (Test-Path $gh)) { throw "GitHub CLI not found at $gh" }
        & $gh repo create $RepoName --public --description $Description
        Write-Host "Created with gh. Pushing main..."
    }
    else {
        Invoke-CreateRepoApi
        Write-Host "Pushing main..."
    }
    git push -u origin main
}
finally {
    Pop-Location
}
