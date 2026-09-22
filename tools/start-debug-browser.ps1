# Dedicated local Chrome profile. Never copies or modifies the normal profile.
$ErrorActionPreference = 'Stop'
$port = 9222
$profile = Join-Path $env:LOCALAPPDATA 'MirrorWhatsAppFocusDebug'
$chrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) {
    $chrome = Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'
}
if (-not (Test-Path $chrome)) { throw 'Google Chrome was not found.' }

$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
    throw 'Port 9222 is already in use. Do not reuse an unidentified debugger. Close the dedicated debug Chrome if restarting it.'
}

Start-Process -FilePath $chrome -ArgumentList @(
    "--user-data-dir=`"$profile`"",
    "--remote-debugging-port=$port",
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    'chrome://extensions/'
)

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $version = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/version" -TimeoutSec 1
        $ready = $true
        break
    } catch { }
}
if (-not $ready) { throw 'Local debugger did not respond. No changes were made to the normal Chrome profile.' }
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop)
if ($listeners.Count -eq 0 -or @($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1', '::1') }).Count -gt 0) {
    # Stop only the dedicated profile we started; never kill normal Chrome.
    Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) -and $_.CommandLine.Contains('--remote-debugging-port=9222') } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    throw 'Unsafe or unverifiable debugger binding. Dedicated debug browser was stopped.'
}
Write-Output "Local debugger ready: $($version.Browser), port $port (loopback only)."
Write-Output 'Load the stable extension manually, then link WhatsApp in this separate profile.'
Write-Output 'Close all windows of this dedicated profile after investigation to stop debugger access.'
