# Script untuk restart development server dan clear cache
Write-Host "Restarting Development Server..." -ForegroundColor Cyan

# Stop all node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "OK - .next folder deleted" -ForegroundColor Green
}

# Clear node_modules/.cache if exists
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "OK - node_modules/.cache deleted" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev (or yarn dev)" -ForegroundColor White
Write-Host "2. In browser, press Ctrl+Shift+R to hard refresh" -ForegroundColor White
Write-Host "3. Or open DevTools (F12) > Application > Clear site data" -ForegroundColor White
Write-Host ""
