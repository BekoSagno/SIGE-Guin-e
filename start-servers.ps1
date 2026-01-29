# Script PowerShell pour démarrer tous les serveurs SIGE-Guinée

Write-Host "🚀 Démarrage des serveurs SIGE-Guinée..." -ForegroundColor Cyan

# Vérifier Docker
Write-Host "`n📦 Vérification de Docker..." -ForegroundColor Yellow
$null = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker n'est pas démarré. Veuillez démarrer Docker Desktop." -ForegroundColor Red
    exit 1
}

# Démarrer PostgreSQL
Write-Host "`n🐘 Démarrage de PostgreSQL..." -ForegroundColor Yellow
cd $PSScriptRoot
docker-compose -f docker-compose.dev.yml up -d
Start-Sleep -Seconds 5

# Vérifier PostgreSQL
$null = docker exec sige-postgres pg_isready -U postgres 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL est prêt" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL n'est pas prêt" -ForegroundColor Red
}

# Démarrer Backend
Write-Host "`n🔧 Démarrage du Backend (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 3

# Démarrer Frontend Citoyen
Write-Host "`n👤 Démarrage du Frontend Citoyen (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\citoyen'; npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 2

# Démarrer Frontend EDG
Write-Host "`n⚡ Démarrage du Frontend EDG (port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\edg'; npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 2

# Démarrer Frontend État
Write-Host "`n🏛️ Démarrage du Frontend État (port 3003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\etat'; npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 5

# Vérifier les ports
Write-Host "`n🔍 Vérification des ports..." -ForegroundColor Yellow
$ports = @(5000, 3001, 3002, 3003)
foreach ($port in $ports) {
    $connection = netstat -ano | Select-String ":$port\s"
    if ($connection) {
        Write-Host "✅ Port $port est actif" -ForegroundColor Green
    } else {
        Write-Host "⏳ Port $port en cours de démarrage..." -ForegroundColor Yellow
    }
}

Write-Host "`n✨ Serveurs démarrés !" -ForegroundColor Green
Write-Host "`n📋 URLs disponibles :" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "  - Frontend Citoyen: http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend EDG: http://localhost:3002" -ForegroundColor White
Write-Host "  - Frontend État: http://localhost:3003" -ForegroundColor White
Write-Host "`n🔑 Comptes de test:" -ForegroundColor Cyan
Write-Host "  - Citoyen: mamadou@test.com / password123" -ForegroundColor White
Write-Host "  - Agent EDG: agent@edg.gn / password123" -ForegroundColor White
Write-Host "  - Admin État: admin@energie.gn / password123" -ForegroundColor White
