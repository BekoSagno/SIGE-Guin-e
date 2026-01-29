# Script de développement amélioré pour SIGE-Guinée
# Usage: 
#   .\dev.ps1                    # Démarrer tous les services
#   .\dev.ps1 backend            # Démarrer seulement le backend
#   .\dev.ps1 frontend citoyen   # Démarrer seulement le frontend citoyen
#   .\dev.ps1 status             # Vérifier l'état des services
#   .\dev.ps1 stop               # Arrêter tous les services

param(
    [Parameter(Position=0)]
    [string]$Action = "all",
    
    [Parameter(Position=1)]
    [string]$Target = ""
)

$rootDir = $PSScriptRoot

# Fonction pour vérifier si un port est utilisé
function Test-Port {
    param([int]$Port)
    $connection = netstat -ano | Select-String ":$Port\s"
    return $null -ne $connection
}

# Fonction pour démarrer un service
function Start-Service {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )
    
    Write-Host "🚀 Démarrage de $Name..." -ForegroundColor Cyan
    
    if (Test-Port $Port) {
        Write-Host "  ⚠️  Le port $Port est déjà utilisé. Le service pourrait déjà être en cours d'exécution." -ForegroundColor Yellow
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Minimized
    Start-Sleep -Seconds 2
    
    Write-Host "  ✅ $Name démarré (port $Port)" -ForegroundColor Green
}

# Fonction pour arrêter les processus Node.js
function Stop-Services {
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "  ✅ Services arrêtés" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Aucun service Node.js en cours d'exécution" -ForegroundColor Gray
    }
}

# Fonction pour afficher le statut
function Show-Status {
    Write-Host "📊 État des services SIGE-Guinée" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    
    $services = @(
        @{ Name = "PostgreSQL"; Port = 5432; Check = { docker ps --filter "name=sige-postgres" --format "{{.Names}}" | Select-String "sige-postgres" } }
        @{ Name = "Backend API"; Port = 5000; Check = { Test-Port 5000 } }
        @{ Name = "Frontend Citoyen"; Port = 3001; Check = { Test-Port 3001 } }
        @{ Name = "Frontend EDG"; Port = 3002; Check = { Test-Port 3002 } }
        @{ Name = "Frontend État"; Port = 3003; Check = { Test-Port 3003 } }
    )
    
    foreach ($service in $services) {
        $isRunning = & $service.Check
        if ($isRunning) {
            Write-Host "  ✅ $($service.Name) : Actif (port $($service.Port))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($service.Name) : Inactif (port $($service.Port))" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🔗 URLs:" -ForegroundColor Cyan
    Write-Host "  - Backend: http://localhost:5000" -ForegroundColor White
    Write-Host "  - Frontend Citoyen: http://localhost:3001" -ForegroundColor White
    Write-Host "  - Frontend EDG: http://localhost:3002" -ForegroundColor White
    Write-Host "  - Frontend État: http://localhost:3003" -ForegroundColor White
    Write-Host ""
}

# ==================== GESTION DES ACTIONS ====================

switch ($Action.ToLower()) {
    "status" {
        Show-Status
        exit 0
    }
    
    "stop" {
        Stop-Services
        exit 0
    }
    
    "backend" {
        Write-Host "🔧 Démarrage du Backend uniquement..." -ForegroundColor Cyan
        Write-Host ""
        
        # Vérifier Docker
        $null = docker ps 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Docker n'est pas démarré. Démarrez Docker Desktop d'abord." -ForegroundColor Yellow
        } else {
            # Démarrer PostgreSQL si nécessaire
            $pgContainer = docker ps --filter "name=sige-postgres" --format "{{.Names}}" 2>&1
            if ($pgContainer -ne "sige-postgres") {
                Write-Host "🐘 Démarrage de PostgreSQL..." -ForegroundColor Yellow
                docker-compose -f docker-compose.dev.yml up -d
                Start-Sleep -Seconds 5
            }
        }
        
        Start-Service -Name "Backend" -Path "$rootDir\backend" -Command "npm run dev" -Port 5000
        Write-Host ""
        Write-Host "✅ Backend démarré sur http://localhost:5000" -ForegroundColor Green
        exit 0
    }
    
    "frontend" {
        if ([string]::IsNullOrWhiteSpace($Target)) {
            Write-Host "❌ Spécifiez quel frontend démarrer: citoyen, edg, ou etat" -ForegroundColor Red
            Write-Host "   Exemple: .\dev.ps1 frontend citoyen" -ForegroundColor Yellow
            exit 1
        }
        
        $frontends = @{
            "citoyen" = @{ Path = "$rootDir\frontend\citoyen"; Port = 3001; Name = "Frontend Citoyen" }
            "edg" = @{ Path = "$rootDir\frontend\edg"; Port = 3002; Name = "Frontend EDG" }
            "etat" = @{ Path = "$rootDir\frontend\etat"; Port = 3003; Name = "Frontend État" }
        }
        
        $targetLower = $Target.ToLower()
        if ($frontends.ContainsKey($targetLower)) {
            $frontend = $frontends[$targetLower]
            Start-Service -Name $frontend.Name -Path $frontend.Path -Command "npm run dev" -Port $frontend.Port
            Write-Host ""
            Write-Host "✅ $($frontend.Name) démarré sur http://localhost:$($frontend.Port)" -ForegroundColor Green
        } else {
            Write-Host "❌ Frontend '$Target' non reconnu. Options: citoyen, edg, etat" -ForegroundColor Red
            exit 1
        }
        exit 0
    }
    
    "all" {
        Write-Host "🚀 Démarrage de tous les services SIGE-Guinée..." -ForegroundColor Cyan
        Write-Host ""
        
        # Vérifier Docker
        $null = docker ps 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Docker n'est pas démarré. Démarrez Docker Desktop d'abord." -ForegroundColor Yellow
            Write-Host ""
        } else {
            # Démarrer PostgreSQL
            Write-Host "🐘 Démarrage de PostgreSQL..." -ForegroundColor Yellow
            docker-compose -f docker-compose.dev.yml up -d
            Start-Sleep -Seconds 5
            
            $null = docker exec sige-postgres pg_isready -U postgres 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ PostgreSQL est prêt" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  PostgreSQL en cours de démarrage..." -ForegroundColor Yellow
            }
            Write-Host ""
        }
        
        # Démarrer Backend
        Start-Service -Name "Backend" -Path "$rootDir\backend" -Command "npm run dev" -Port 5000
        Start-Sleep -Seconds 3
        
        # Démarrer Frontends
        Start-Service -Name "Frontend Citoyen" -Path "$rootDir\frontend\citoyen" -Command "npm run dev" -Port 3001
        Start-Sleep -Seconds 2
        
        Start-Service -Name "Frontend EDG" -Path "$rootDir\frontend\edg" -Command "npm run dev" -Port 3002
        Start-Sleep -Seconds 2
        
        Start-Service -Name "Frontend État" -Path "$rootDir\frontend\etat" -Command "npm run dev" -Port 3003
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "✨ Tous les services sont démarrés!" -ForegroundColor Green
        Write-Host ""
        Show-Status
        exit 0
    }
    
    default {
        Write-Host "❌ Action '$Action' non reconnue" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Cyan
        Write-Host "  .\dev.ps1                    # Démarrer tous les services" -ForegroundColor White
        Write-Host "  .\dev.ps1 backend             # Démarrer seulement le backend" -ForegroundColor White
        Write-Host "  .\dev.ps1 frontend citoyen    # Démarrer seulement le frontend citoyen" -ForegroundColor White
        Write-Host "  .\dev.ps1 frontend edg        # Démarrer seulement le frontend EDG" -ForegroundColor White
        Write-Host "  .\dev.ps1 frontend etat       # Démarrer seulement le frontend État" -ForegroundColor White
        Write-Host "  .\dev.ps1 status              # Vérifier l'état des services" -ForegroundColor White
        Write-Host "  .\dev.ps1 stop                # Arrêter tous les services" -ForegroundColor White
        exit 1
    }
}
