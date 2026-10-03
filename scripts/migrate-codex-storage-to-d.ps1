$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$destinationRoot = "D:\MYB_DATA\CodexStorage"
$logPath = Join-Path $destinationRoot "migration.log"
$mappings = @(
  @{
    Source = "C:\Users\Admin\.codex"
    Target = "D:\MYB_DATA\CodexStorage\home"
  },
  @{
    Source = "C:\Users\Admin\.cache\codex-runtimes"
    Target = "D:\MYB_DATA\CodexStorage\runtime-cache"
  },
  @{
    Source = "C:\Users\Admin\AppData\Local\OpenAI\Codex"
    Target = "D:\MYB_DATA\CodexStorage\app-local"
  },
  @{
    Source = "C:\Users\Admin\AppData\Roaming\Codex"
    Target = "D:\MYB_DATA\CodexStorage\app-roaming"
  }
)

function Write-MigrationLog([string]$message) {
  $line = "$(Get-Date -Format o) $message"
  Add-Content -LiteralPath $logPath -Value $line -Encoding utf8
}

function Assert-MigrationPath([string]$path, [string]$requiredRoot) {
  $fullPath = [IO.Path]::GetFullPath($path).TrimEnd("\")
  $fullRoot = [IO.Path]::GetFullPath($requiredRoot).TrimEnd("\")
  if (-not $fullPath.StartsWith($fullRoot + "\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe migration path: $fullPath"
  }
}

function Get-DirectoryStats([string]$path) {
  $files = @(Get-ChildItem -LiteralPath $path -File -Recurse -Force -ErrorAction Stop)
  return @{
    Count = $files.Count
    Bytes = ($files | Measure-Object Length -Sum).Sum
  }
}

New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
Write-MigrationLog "Waiting for Codex processes to close."

$deadline = (Get-Date).AddHours(12)
do {
  $active = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -in @(
      "ChatGPT.exe",
      "codex.exe",
      "codex-code-mode-host.exe",
      "codex-computer-use-swift.exe",
      "node_repl.exe"
    ) -or
    ($_.ExecutablePath -and (
      $_.ExecutablePath.StartsWith("C:\Users\Admin\.cache\codex-runtimes", [StringComparison]::OrdinalIgnoreCase) -or
      $_.ExecutablePath.StartsWith("C:\Users\Admin\AppData\Local\OpenAI\Codex", [StringComparison]::OrdinalIgnoreCase)
    ))
  })
  if ($active.Count -eq 0) { break }
  Start-Sleep -Seconds 5
} while ((Get-Date) -lt $deadline)

if ($active.Count -gt 0) {
  Write-MigrationLog "Timed out while Codex processes were still active. No source directory was deleted."
  exit 2
}

Start-Sleep -Seconds 3
foreach ($mapping in $mappings) {
  $source = $mapping.Source
  $target = $mapping.Target
  Assert-MigrationPath $source "C:\Users\Admin"
  Assert-MigrationPath $target $destinationRoot

  if (-not (Test-Path -LiteralPath $source)) {
    Write-MigrationLog "Source already absent: $source"
    continue
  }
  $sourceItem = Get-Item -LiteralPath $source -Force
  if ($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-MigrationLog "Source already redirects to D: $source"
    continue
  }

  New-Item -ItemType Directory -Path $target -Force | Out-Null
  & robocopy.exe $source $target /E /COPY:DAT /DCOPY:DAT /R:3 /W:2 /XJ /NFL /NDL /NJH /NJS /NP
  $copyExitCode = $LASTEXITCODE
  if ($copyExitCode -ge 8) {
    throw "Robocopy failed for $source with code $copyExitCode"
  }

  $sourceStats = Get-DirectoryStats $source
  $targetStats = Get-DirectoryStats $target
  if ($targetStats.Count -lt $sourceStats.Count -or $targetStats.Bytes -lt $sourceStats.Bytes) {
    throw "Verification failed for $source; source remains intact"
  }

  Remove-Item -LiteralPath $source -Recurse -Force
  New-Item -ItemType Junction -Path $source -Target $target | Out-Null
  $junction = Get-Item -LiteralPath $source -Force
  if (-not ($junction.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Junction verification failed for $source"
  }
  Write-MigrationLog "Moved $source to $target and created a junction."
}

$package = Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue
$targetVolume = Get-AppxVolume | Where-Object {
  $_.PackageStorePath -eq "D:\WindowsApps"
} | Select-Object -First 1
if (
  $package -and
  $targetVolume -and
  $package.InstallLocation.StartsWith(
    "C:\Program Files\WindowsApps\OpenAI.Codex_",
    [StringComparison]::OrdinalIgnoreCase
  )
) {
  Move-AppxPackage `
    -Package $package.PackageFullName `
    -Volume $targetVolume `
    -ErrorAction Stop
  Write-MigrationLog "Moved the OpenAI.Codex app package to D:\WindowsApps."
}

Write-MigrationLog "Migration completed successfully."
Remove-ItemProperty `
  -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce" `
  -Name "BizFlowCodexStorageMigration" `
  -ErrorAction SilentlyContinue
