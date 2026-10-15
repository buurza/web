#!/usr/bin/env pwsh
# Add db.local hostname entry to Windows hosts file
# Requires running as Administrator

Write-Host "`n🔧 Adding db.local to Windows hosts file..." -ForegroundColor Cyan

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"

# Check if already exists
$content = Get-Content $hostsPath -ErrorAction SilentlyContinue
if ($content | Select-String "db.local") {
    Write-Host "`n✅ db.local entry already exists!" -ForegroundColor Green
    $content | Select-String "db.local"
} else {
    # Add the entry
    [System.IO.File]::AppendAllText($hostsPath, "`n# db-local hostname configuration`n127.0.0.1       db.local`n::1             db.local`n")
    
    Write-Host "`n✅ Added db.local entry to hosts file:" -ForegroundColor Green
    Write-Host "   127.0.0.1       db.local"
    Write-Host "   ::1             db.local"
}

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Open a NEW PowerShell window (close the admin one)"
Write-Host "2. Run: ipconfig /flushdns"
Write-Host "3. Visit http://db.local in your browser"
Write-Host "4. Login with: admin / admin`n"

Read-Host "Press Enter to close..."
