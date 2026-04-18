# TileTrainBot installer for Windows.
# Usage (PowerShell, any shell):
#   iwr -useb https://raw.githubusercontent.com/PanaitAlessandro/tiletrainbot/main/install.ps1 | iex
#
# Downloads the latest .msi from GitHub Releases and runs it silently.

$ErrorActionPreference = "Stop"
$Repo = if ($env:TILETRAINBOT_REPO) { $env:TILETRAINBOT_REPO } else { "PanaitAlessandro/tiletrainbot" }
$Api  = "https://api.github.com/repos/$Repo/releases/latest"

Write-Host "-> Fetching latest TileTrainBot release..."
$release = Invoke-RestMethod -Uri $Api -Headers @{ "User-Agent" = "tiletrainbot-installer" }

$asset = $release.assets | Where-Object { $_.name -like "*.msi" } | Select-Object -First 1
if (-not $asset) {
  $asset = $release.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1
}
if (-not $asset) {
  throw "No .msi or .exe asset found in $Repo releases. See https://github.com/$Repo/releases"
}

$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "tiletrainbot-$(Get-Random)") -Force
$out = Join-Path $tmp.FullName $asset.name
Write-Host "-> Downloading $($asset.browser_download_url)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $out -UseBasicParsing

Write-Host "-> Running installer..."
if ($out.EndsWith(".msi")) {
  Start-Process msiexec.exe -ArgumentList "/i","`"$out`"","/passive","/norestart" -Wait
} else {
  Start-Process -FilePath $out -ArgumentList "/S" -Wait
}

Remove-Item -Recurse -Force $tmp.FullName -ErrorAction SilentlyContinue
Write-Host "TileTrainBot installed. Launch from Start Menu."
