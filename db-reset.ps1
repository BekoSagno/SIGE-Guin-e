# Script de réinitialisation complète de la base de données
# Usage: .\db-reset.ps1

Write-Host "🔄 Réinitialisation complète de la base de données SIGE-Guinée..." -ForegroundColor Cyan
Write-Host ""

# Vérifier Docker
$null = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker n'est pas démarré. Démarrez Docker Desktop d'abord." -ForegroundColor Red
    exit 1
}

# Vérifier le conteneur PostgreSQL
$pgContainer = docker ps --filter "name=sige-postgres" --format "{{.Names}}" 2>&1
if ($pgContainer -ne "sige-postgres") {
    Write-Host "❌ Le conteneur PostgreSQL n'est pas en cours d'exécution." -ForegroundColor Red
    Write-Host "💡 Démarrez-le avec: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
    exit 1
}

Write-Host "⚠️  ATTENTION: Cette opération va:" -ForegroundColor Red
Write-Host "   1. Supprimer TOUTES les données de la base de données" -ForegroundColor Red
Write-Host "   2. Réappliquer toutes les migrations" -ForegroundColor Red
Write-Host "   3. Repeupler la base avec les données de test" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "❌ Réinitialisation annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🗑️  Suppression de la base de données..." -ForegroundColor Yellow

# Supprimer et recréer la base de données
docker exec sige-postgres psql -U postgres -c "DROP DATABASE IF EXISTS sige_guinee;"
docker exec sige-postgres psql -U postgres -c "CREATE DATABASE sige_guinee;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la réinitialisation de la base de données" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Base de données recréée" -ForegroundColor Green

# Aller dans le dossier backend
$rootDir = $PSScriptRoot
Set-Location "$rootDir\backend"

Write-Host ""
Write-Host "🔨 Régénération du client Prisma..." -ForegroundColor Yellow
npm run db:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la génération du client Prisma" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
Write-Host "  ✅ Client Prisma régénéré" -ForegroundColor Green

Write-Host ""
Write-Host "📝 Application des migrations..." -ForegroundColor Yellow
npm run db:migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
Write-Host "  ✅ Migrations appliquées" -ForegroundColor Green

Write-Host ""
Write-Host "🌱 Peuplement de la base de données..." -ForegroundColor Yellow
npm run db:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du peuplement de la base de données" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
Write-Host "  ✅ Base de données peuplée" -ForegroundColor Green

Set-Location $rootDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Base de données réinitialisée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Comptes de test disponibles:" -ForegroundColor Cyan
Write-Host "  - Citoyen: mamadou@test.com / password123" -ForegroundColor White
Write-Host "  - Agent EDG: agent@edg.gn / password123" -ForegroundColor White
Write-Host "  - Admin État: admin@energie.gn / password123" -ForegroundColor White
Write-Host ""
