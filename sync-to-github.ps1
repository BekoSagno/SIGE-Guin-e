# Script de synchronisation automatique vers GitHub
# Usage: .\sync-to-github.ps1 "Message de commit"

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "Mise à jour du projet SIGE-Guinée"
)

Write-Host "🔄 Synchronisation vers GitHub..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que Git est initialisé
if (-not (Test-Path .git)) {
    Write-Host "❌ Erreur: Ce n'est pas un dépôt Git!" -ForegroundColor Red
    exit 1
}

# Vérifier l'état
Write-Host "📊 Vérification de l'état Git..." -ForegroundColor Yellow
$status = git status --porcelain

if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ Aucun changement à commiter." -ForegroundColor Green
    exit 0
}

# Afficher les changements
Write-Host ""
Write-Host "📝 Fichiers modifiés:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Ajouter tous les fichiers
Write-Host "➕ Ajout des fichiers..." -ForegroundColor Yellow
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'ajout des fichiers!" -ForegroundColor Red
    exit 1
}

# Créer le commit
Write-Host "💾 Création du commit..." -ForegroundColor Yellow
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la création du commit!" -ForegroundColor Red
    exit 1
}

# Pusher vers GitHub
Write-Host "🚀 Envoi vers GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du push vers GitHub!" -ForegroundColor Red
    Write-Host "💡 Vérifiez votre connexion et vos credentials GitHub." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Synchronisation réussie!" -ForegroundColor Green
Write-Host "🔗 Dépôt: https://github.com/BekoSagno/SIGE-Guin-e" -ForegroundColor Cyan
Write-Host ""
