# Fix script for PlatformConstants TurboModule error
# This script clears all caches and rebuilds the app

Write-Host "🔧 Fixing PlatformConstants TurboModule error..." -ForegroundColor Cyan

# Step 1: Stop Metro bundler if running
Write-Host "`n📦 Step 1: Stopping Metro bundler..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Step 2: Stop Gradle daemons
Write-Host "`n🛑 Step 2: Stopping Gradle daemons..." -ForegroundColor Yellow
cd android
.\gradlew --stop
cd ..

# Step 3: Clear Metro bundler cache
Write-Host "`n🧹 Step 3: Clearing Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
}

# Step 4: Clear React Native cache
Write-Host "`n🧹 Step 4: Clearing React Native cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# Step 5: Clear Android build cache
Write-Host "`n🧹 Step 5: Clearing Android build cache..." -ForegroundColor Yellow
cd android
.\gradlew clean
Remove-Item -Recurse -Force "app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".gradle" -ErrorAction SilentlyContinue
cd ..

# Step 6: Clear watchman cache (if installed)
Write-Host "`n🧹 Step 6: Clearing Watchman cache..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>$null
}

Write-Host "`n✅ Cache clearing complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Metro bundler with: npm run start:reset" -ForegroundColor White
Write-Host "2. In a new terminal, rebuild the app: npm run android" -ForegroundColor White




