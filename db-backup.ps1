# Script de sauvegarde de la base de données PostgreSQL
# Usage: .\db-backup.ps1 [nom-du-fichier]

param(
    [Parameter(Mandatory=$false)]
    [string]$FileName = ""
)

Write-Host "💾 Sauvegarde de la base de données SIGE-Guinée..." -ForegroundColor Cyan
Write-Host ""

# Vérifier Docker
$dockerStatus = docker ps 2>&1
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

# Créer le dossier de sauvegarde s'il n'existe pas
$backupDir = "$PSScriptRoot\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "📁 Dossier de sauvegarde créé: $backupDir" -ForegroundColor Green
}

# Générer le nom du fichier si non fourni
if ([string]::IsNullOrWhiteSpace($FileName)) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $FileName = "sige_guinee_backup_$timestamp.sql"
}

$backupPath = Join-Path $backupDir $FileName

Write-Host "📦 Création de la sauvegarde..." -ForegroundColor Yellow
Write-Host "  Fichier: $backupPath" -ForegroundColor Gray

# Créer la sauvegarde
$backupCommand = "pg_dump -U postgres -d sige_guinee > /tmp/backup.sql"
docker exec sige-postgres sh -c $backupCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la création de la sauvegarde" -ForegroundColor Red
    exit 1
}

# Copier le fichier depuis le conteneur
docker cp sige-postgres:/tmp/backup.sql $backupPath

if ($LASTEXITCODE -eq 0) {
    # Nettoyer le fichier temporaire dans le conteneur
    docker exec sige-postgres rm /tmp/backup.sql
    
    $fileSize = (Get-Item $backupPath).Length / 1MB
    Write-Host ""
    Write-Host "✅ Sauvegarde créée avec succès!" -ForegroundColor Green
    Write-Host "  📁 Emplacement: $backupPath" -ForegroundColor Cyan
    Write-Host "  📊 Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Pour restaurer, utilisez: .\db-restore.ps1 '$FileName'" -ForegroundColor Yellow
} else {
    Write-Host "❌ Erreur lors de la copie du fichier de sauvegarde" -ForegroundColor Red
    exit 1
}
