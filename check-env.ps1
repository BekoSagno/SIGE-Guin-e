# Script de validation des variables d'environnement
# Usage: .\check-env.ps1

Write-Host "🔍 Vérification des variables d'environnement..." -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
$errors = @()
$warnings = @()

# ==================== VÉRIFICATION BACKEND ====================
Write-Host "📋 Backend (.env)" -ForegroundColor Yellow
$backendEnv = "$rootDir\backend\.env"

if (Test-Path $backendEnv) {
    Write-Host "  ✅ Fichier .env existe" -ForegroundColor Green
    
    # Charger les variables
    $envContent = Get-Content $backendEnv | Where-Object { $_ -match '^[^#]' -and $_ -match '=' }
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            $envVars[$key] = $value
        }
    }
    
    # Variables requises
    $requiredVars = @(
        @{ Name = "DATABASE_URL"; Description = "URL de connexion PostgreSQL" },
        @{ Name = "JWT_SECRET"; Description = "Clé secrète JWT" },
        @{ Name = "PORT"; Description = "Port du serveur" }
    )
    
    foreach ($var in $requiredVars) {
        if ($envVars.ContainsKey($var.Name)) {
            $value = $envVars[$var.Name]
            if ([string]::IsNullOrWhiteSpace($value) -or $value -eq "your-super-secret-jwt-key-change-in-production-min-32-chars") {
                $warnings += "  ⚠️  $($var.Name) : Valeur par défaut détectée (à modifier!)"
            } else {
                if ($var.Name -eq "DATABASE_URL") {
                    Write-Host "  ✅ $($var.Name) : Configuré" -ForegroundColor Green
                } else {
                    Write-Host "  ✅ $($var.Name) : Configuré" -ForegroundColor Green
                }
            }
        } else {
            $errors += "  ❌ $($var.Name) : Manquant ($($var.Description))"
        }
    }
    
    # Vérifications spéciales
    if ($envVars.ContainsKey("JWT_SECRET")) {
        $jwtSecret = $envVars["JWT_SECRET"]
        if ($jwtSecret.Length -lt 32) {
            $warnings += "  ⚠️  JWT_SECRET : Doit faire au moins 32 caractères (actuellement: $($jwtSecret.Length))"
        }
    }
    
    if ($envVars.ContainsKey("DATABASE_URL")) {
        $dbUrl = $envVars["DATABASE_URL"]
        if ($dbUrl -notmatch "postgresql://") {
            $errors += "  ❌ DATABASE_URL : Format invalide (doit commencer par postgresql://)"
        }
    }
    
} else {
    $errors += "  ❌ Fichier .env manquant dans backend/"
    Write-Host "  💡 Créez-le avec: cp backend/env.example backend/.env" -ForegroundColor Cyan
}

Write-Host ""

# ==================== VÉRIFICATION DOCKER ====================
Write-Host "🐳 Docker & PostgreSQL" -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Docker est actif" -ForegroundColor Green
    
    # Vérifier le conteneur PostgreSQL
    $pgContainer = docker ps --filter "name=sige-postgres" --format "{{.Names}}" 2>&1
    if ($pgContainer -eq "sige-postgres") {
        Write-Host "  ✅ Conteneur PostgreSQL est en cours d'exécution" -ForegroundColor Green
        
        # Tester la connexion
        $pgReady = docker exec sige-postgres pg_isready -U postgres 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ PostgreSQL est prêt à accepter les connexions" -ForegroundColor Green
        } else {
            $warnings += "  ⚠️  PostgreSQL n'est pas encore prêt"
        }
    } else {
        $warnings += "  ⚠️  Conteneur PostgreSQL n'est pas démarré"
        Write-Host "  💡 Démarrez-le avec: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
    }
} else {
    $warnings += "  ⚠️  Docker n'est pas démarré"
    Write-Host "  💡 Démarrez Docker Desktop" -ForegroundColor Cyan
}

Write-Host ""

# ==================== RÉSUMÉ ====================
Write-Host "========================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Toutes les vérifications sont passées!" -ForegroundColor Green
    exit 0
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Avertissements:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host $warning -ForegroundColor Yellow
    }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Erreurs:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host $error -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "💡 Corrigez ces erreurs avant de continuer." -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "✅ Configuration valide (avec quelques avertissements)" -ForegroundColor Green
exit 0
