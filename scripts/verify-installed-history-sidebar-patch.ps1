param(
  [switch]$RequireRunning
)

<#
.SYNOPSIS
  Verify whether the installed Codex Desktop app.asar contains the history sidebar patch.

.DESCRIPTION
  Performs read-only string checks against the installed OpenAI.Codex app.asar. The output may
  include local package paths, so sanitize command output before sharing it publicly.

.NOTES
  Platform: Windows PowerShell / PowerShell.
  Mutates system: no.
  Prerequisites: ripgrep (`rg`) for binary-safe string scanning.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-installed-history-sidebar-patch.ps1
#>

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "[verify-history-sidebar-patch] $Message"
}

$pkg = Get-AppxPackage -Name OpenAI.Codex -ErrorAction Stop | Select-Object -First 1
if (-not $pkg -or -not $pkg.InstallLocation) {
  Fail 'OpenAI.Codex package not found'
}

$asar = Join-Path $pkg.InstallLocation 'app\resources\app.asar'
if (-not (Test-Path -LiteralPath $asar -PathType Leaf)) {
  Fail "app.asar not found: $asar"
}

$rg = Get-Command rg -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $rg) {
  Fail 'rg is required for binary-safe app.asar string verification'
}

function Test-AsarString([string]$Needle) {
  $output = & $rg.Source -a --fixed-strings $Needle $asar
  return [bool]$output
}

$patchedFirst = Test-AsarString 'this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:!1})'
$patchedNext = Test-AsarString 'this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!1})'
$oldFirst = Test-AsarString 'this.listRecentThreads({limit:a,cursor:null,useStateDbOnly:i})'
$oldNext = Test-AsarString 'this.listRecentThreads({limit:a-e.length,cursor:n,useStateDbOnly:!0})'

$running = @(Get-Process Codex -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -and $_.Path.StartsWith($pkg.InstallLocation, [StringComparison]::OrdinalIgnoreCase)
})

if (-not $patchedFirst -or -not $patchedNext -or $oldFirst -or $oldNext) {
  [pscustomobject]@{
    PackageFullName = $pkg.PackageFullName
    Version = $pkg.Version.ToString()
    SignatureKind = $pkg.SignatureKind.ToString()
    InstallLocation = $pkg.InstallLocation
    WindowsAppsCodexProcessCount = $running.Count
    PatchedFirstCallPresent = $patchedFirst
    PatchedPaginationCallPresent = $patchedNext
    OldFirstCallPresent = $oldFirst
    OldPaginationCallPresent = $oldNext
  } | Format-List
  Fail 'installed app.asar does not match expected history sidebar patch shape'
}

if ($RequireRunning -and $running.Count -eq 0) {
  Fail 'Codex Desktop is not running from the installed package'
}

[pscustomobject]@{
  PackageFullName = $pkg.PackageFullName
  Version = $pkg.Version.ToString()
  SignatureKind = $pkg.SignatureKind.ToString()
  InstallLocation = $pkg.InstallLocation
  WindowsAppsCodexProcessCount = $running.Count
  PatchedFirstCallPresent = $patchedFirst
  PatchedPaginationCallPresent = $patchedNext
  OldFirstCallPresent = $oldFirst
  OldPaginationCallPresent = $oldNext
} | Format-List
