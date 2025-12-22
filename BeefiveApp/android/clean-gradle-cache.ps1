# Script to clean corrupted Gradle transform cache
# Run this before building if you encounter transform cache errors

Write-Host "Stopping Gradle daemons..."
& .\gradlew --stop 2>&1 | Out-Null

Write-Host "Stopping Java processes..."
Get-Process | Where-Object { $_.ProcessName -like "*java*" -or $_.ProcessName -like "*gradle*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Clearing corrupted transform cache..."
$transformsPath = "$env:USERPROFILE\.gradle\caches\9.0.0\transforms"
if (Test-Path $transformsPath) {
    # Use cmd rmdir to handle long paths on Windows - delete entire transforms directory
    cmd /c "rmdir /s /q `"$transformsPath`"" 2>&1 | Out-Null
    Write-Host "Transform cache cleared"
}

# Also clear the specific problematic directory if it exists
$problemDir = "$env:USERPROFILE\.gradle\caches\9.0.0\transforms\1e84847373c8b60ddb3f088099977c2a"
if (Test-Path $problemDir) {
    cmd /c "rmdir /s /q `"$problemDir`"" 2>&1 | Out-Null
    Write-Host "Problematic transform directory removed"
}

Write-Host "Clearing local build directories..."
Remove-Item -Path "app\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Cache cleanup complete!"
Write-Host "You can now run: .\gradlew clean"

