# Script PowerShell pour appliquer la migration EDG
# Usage: .\apply-edg-migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SIGE-Guinée - Migration EDG Tables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Docker est en cours d'exécution
Write-Host "Vérification de Docker..." -ForegroundColor Yellow
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Docker n'est pas en cours d'exécution!" -ForegroundColor Red
    exit 1
}

# Vérifier que le conteneur PostgreSQL existe
Write-Host "Vérification du conteneur PostgreSQL..." -ForegroundColor Yellow
$containerCheck = docker ps --filter "name=sige-postgres" --format "{{.Names}}"
if (-not $containerCheck) {
    Write-Host "ERREUR: Le conteneur sige-postgres n'est pas en cours d'exécution!" -ForegroundColor Red
    Write-Host "Lancez d'abord: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "Conteneur PostgreSQL trouvé: $containerCheck" -ForegroundColor Green

# Copier le fichier de migration dans le conteneur
Write-Host ""
Write-Host "Copie du fichier de migration..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "migrations\add_edg_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERREUR: Fichier de migration non trouvé: $migrationFile" -ForegroundColor Red
    exit 1
}

docker cp $migrationFile sige-postgres:/tmp/add_edg_tables.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Impossible de copier le fichier de migration" -ForegroundColor Red
    exit 1
}
Write-Host "Fichier copié avec succès" -ForegroundColor Green

# Exécuter la migration
Write-Host ""
Write-Host "Exécution de la migration..." -ForegroundColor Yellow
$result = docker exec sige-postgres psql -U postgres -d sige_guinee -f /tmp/add_edg_tables.sql 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'exécution de la migration:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host $result -ForegroundColor Gray

# Vérifier les tables créées
Write-Host ""
Write-Host "Vérification des tables créées..." -ForegroundColor Yellow

$tables = @(
    "broadcast_messages",
    "broadcast_templates", 
    "reconciliation_runs",
    "reconciliation_results",
    "audit_tickets",
    "transformer_maintenance",
    "transformer_anomalies",
    "mqtt_command_log"
)

foreach ($table in $tables) {
    $check = docker exec sige-postgres psql -U postgres -d sige_guinee -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>&1
    if ($check -match "t") {
        Write-Host "  ✓ Table $table créée" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Table $table NON trouvée" -ForegroundColor Red
    }
}

# Nettoyage
Write-Host ""
Write-Host "Nettoyage..." -ForegroundColor Yellow
docker exec sige-postgres rm -f /tmp/add_edg_tables.sql 2>&1 | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Migration terminée avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vous pouvez maintenant redémarrer le backend:" -ForegroundColor Yellow
Write-Host "  cd backend && npm run dev" -ForegroundColor White
Write-Host ""
