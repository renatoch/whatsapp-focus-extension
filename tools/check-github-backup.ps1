param(
  [switch]$NoToast
)

$ErrorActionPreference = "Stop"
$scriptWindowsPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "check-github-backup.sh"))
if ($scriptWindowsPath -notmatch '^([A-Za-z]):\\(.*)$') {
  throw "The backup checker must be stored on a Windows drive visible to WSL."
}
$drive = $Matches[1].ToLowerInvariant()
$relativePath = $Matches[2].Replace("\", "/")
$scriptWslPath = "/mnt/$drive/$relativePath"

$output = @(& wsl.exe -e bash $scriptWslPath --max-age-hours 24 2>&1)
$exitCode = $LASTEXITCODE
$logDirectory = Join-Path $env:LOCALAPPDATA "MirrorWhatsAppFocusBackup"
$logPath = Join-Path $logDirectory "last-check.txt"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$output | Set-Content -Path $logPath -Encoding UTF8

if ($exitCode -ne 0 -and -not $NoToast) {
  $summary = ($output | Select-Object -Last 1)
  $escapedSummary = [System.Security.SecurityElement]::Escape([string]$summary)
  $xml = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]::new()
  $xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>WhatsApp Focus: backup pendente</text><text>$escapedSummary</text></binding></visual></toast>")
  $toast = [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]::new($xml)
  $manager = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
  $manager::CreateToastNotifier("Mirror WhatsApp Focus Backup").Show($toast)
}

$output | ForEach-Object { Write-Output $_ }
exit $exitCode
