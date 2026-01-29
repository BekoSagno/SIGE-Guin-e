# Script de restauration de la base de données PostgreSQL
# Usage: .\db-restore.ps1 [nom-du-fichier]

param(
    [Parameter(Mandatory=$true)]
    [string]$FileName
)

Write-Host "🔄 Restauration de la base de données SIGE-Guinée..." -ForegroundColor Cyan
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

# Vérifier que le fichier existe
$backupDir = "$PSScriptRoot\backups"
$backupPath = Join-Path $backupDir $FileName

if (-not (Test-Path $backupPath)) {
    Write-Host "❌ Fichier de sauvegarde non trouvé: $backupPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "📁 Sauvegardes disponibles:" -ForegroundColor Yellow
    if (Test-Path $backupDir) {
        Get-ChildItem $backupDir -Filter "*.sql" | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor White
        }
    }
    exit 1
}

Write-Host "⚠️  ATTENTION: Cette opération va écraser toutes les données actuelles!" -ForegroundColor Red
Write-Host "   Fichier: $backupPath" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "❌ Restauration annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "📦 Copie du fichier de sauvegarde dans le conteneur..." -ForegroundColor Yellow
docker cp $backupPath sige-postgres:/tmp/restore.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la copie du fichier" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Restauration en cours..." -ForegroundColor Yellow

# Restaurer la base de données
# D'abord, se connecter et restaurer
$restoreCommand = "psql -U postgres -d sige_guinee -f /tmp/restore.sql"
docker exec sige-postgres sh -c $restoreCommand

if ($LASTEXITCODE -eq 0) {
    # Nettoyer le fichier temporaire
    docker exec sige-postgres rm /tmp/restore.sql
    
    Write-Host ""
    Write-Host "✅ Base de données restaurée avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Vous devrez peut-être régénérer le client Prisma:" -ForegroundColor Yellow
    Write-Host "   cd backend && npm run db:generate" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors de la restauration" -ForegroundColor Red
    Write-Host "💡 Vérifiez que le fichier de sauvegarde est valide" -ForegroundColor Yellow
    exit 1
}
