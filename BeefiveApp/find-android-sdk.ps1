# PowerShell script to find Android SDK and add platform-tools to PATH

Write-Host "Searching for Android SDK..." -ForegroundColor Cyan

# Common Android SDK locations on Windows
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ProgramFiles\Android\Sdk",
    "$env:ProgramFiles(x86)\Android\Sdk"
)

$sdkPath = $null

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $platformToolsPath = Join-Path $path "platform-tools"
        if (Test-Path $platformToolsPath) {
            $adbPath = Join-Path $platformToolsPath "adb.exe"
            if (Test-Path $adbPath) {
                $sdkPath = $path
                Write-Host "`n✓ Found Android SDK at: $sdkPath" -ForegroundColor Green
                Write-Host "✓ Platform-tools found at: $platformToolsPath" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $sdkPath) {
    Write-Host "`n✗ Android SDK not found in common locations." -ForegroundColor Red
    Write-Host "`nPlease check Android Studio:" -ForegroundColor Yellow
    Write-Host "  File → Settings → Appearance & Behavior → System Settings → Android SDK" -ForegroundColor Yellow
    Write-Host "  Look for 'Android SDK Location'" -ForegroundColor Yellow
    exit 1
}

$platformToolsPath = Join-Path $sdkPath "platform-tools"

Write-Host "`nTo add to PATH permanently:" -ForegroundColor Cyan
Write-Host "1. Press Win + X → System" -ForegroundColor White
Write-Host "2. Click 'Advanced system settings'" -ForegroundColor White
Write-Host "3. Click 'Environment Variables'" -ForegroundColor White
Write-Host "4. Under 'System variables', select 'Path' → 'Edit'" -ForegroundColor White
Write-Host "5. Click 'New' and add: $platformToolsPath" -ForegroundColor White
Write-Host "6. Click OK on all dialogs" -ForegroundColor White
Write-Host "7. Close and reopen your terminal" -ForegroundColor White

Write-Host "`nOr add temporarily for this session:" -ForegroundColor Cyan
Write-Host "  `$env:Path += `";$platformToolsPath`"" -ForegroundColor Yellow

Write-Host "`nTesting adb..." -ForegroundColor Cyan
$env:Path += ";$platformToolsPath"
$adbVersion = & "$platformToolsPath\adb.exe" version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ adb is working!" -ForegroundColor Green
    Write-Host $adbVersion
} else {
    Write-Host "✗ adb test failed" -ForegroundColor Red
}

Write-Host "`nTo verify devices, run:" -ForegroundColor Cyan
Write-Host "  adb devices" -ForegroundColor Yellow

