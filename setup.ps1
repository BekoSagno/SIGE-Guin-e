# Script d'installation complète pour SIGE-Guinée
# Usage: .\setup.ps1

Write-Host "🚀 Installation complète de SIGE-Guinée" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si une commande existe
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# ==================== VÉRIFICATION DES PRÉREQUIS ====================
Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow
Write-Host ""

$prerequisites = @{
    "Node.js" = @{ Command = "node"; MinVersion = "18.0.0"; CheckVersion = { node --version } }
    "npm" = @{ Command = "npm"; CheckVersion = { npm --version } }
    "Docker" = @{ Command = "docker"; CheckVersion = { docker --version } }
    "Git" = @{ Command = "git"; CheckVersion = { git --version } }
}

$allOk = $true
foreach ($prereq in $prerequisites.GetEnumerator()) {
    $name = $prereq.Key
    $config = $prereq.Value
    
    if (Test-Command $config.Command) {
        try {
            $version = Invoke-Expression $config.CheckVersion
            Write-Host "  ✅ $name : $version" -ForegroundColor Green
        } catch {
            Write-Host "  ✅ $name : Installé" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ $name : NON INSTALLÉ" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "❌ Certains prérequis manquent. Veuillez les installer avant de continuer." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Tous les prérequis sont installés!" -ForegroundColor Green
Write-Host ""

# ==================== INSTALLATION DES DÉPENDANCES ====================
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
Write-Host ""

$rootDir = $PSScriptRoot

# Backend
Write-Host "🔧 Installation Backend..." -ForegroundColor Cyan
Set-Location "$rootDir\backend"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation du backend" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Backend installé" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Backend déjà installé" -ForegroundColor Yellow
}

# Frontend Common
Write-Host "🔧 Installation Frontend Common..." -ForegroundColor Cyan
Set-Location "$rootDir\frontend\common"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation du frontend common" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Frontend Common installé" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Frontend Common déjà installé" -ForegroundColor Yellow
}

# Frontend Citoyen
Write-Host "🔧 Installation Frontend Citoyen..." -ForegroundColor Cyan
Set-Location "$rootDir\frontend\citoyen"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation du frontend citoyen" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Frontend Citoyen installé" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Frontend Citoyen déjà installé" -ForegroundColor Yellow
}

# Frontend EDG
Write-Host "🔧 Installation Frontend EDG..." -ForegroundColor Cyan
Set-Location "$rootDir\frontend\edg"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation du frontend EDG" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Frontend EDG installé" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Frontend EDG déjà installé" -ForegroundColor Yellow
}

# Frontend État
Write-Host "🔧 Installation Frontend État..." -ForegroundColor Cyan
Set-Location "$rootDir\frontend\etat"
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation du frontend État" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ Frontend État installé" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Frontend État déjà installé" -ForegroundColor Yellow
}

Set-Location $rootDir

Write-Host ""
Write-Host "✅ Toutes les dépendances sont installées!" -ForegroundColor Green
Write-Host ""

# ==================== CONFIGURATION DES VARIABLES D'ENVIRONNEMENT ====================
Write-Host "⚙️  Configuration des variables d'environnement..." -ForegroundColor Yellow
Write-Host ""

# Backend .env
Set-Location "$rootDir\backend"
if (-not (Test-Path ".env")) {
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "  ✅ Fichier .env créé depuis env.example" -ForegroundColor Green
        Write-Host "  ⚠️  N'oubliez pas de modifier .env avec vos paramètres!" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  env.example non trouvé, création d'un .env basique" -ForegroundColor Yellow
        @"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sige_guinee?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    }
} else {
    Write-Host "  ⏭️  Fichier .env existe déjà" -ForegroundColor Yellow
}

Set-Location $rootDir

Write-Host ""
Write-Host "✅ Configuration terminée!" -ForegroundColor Green
Write-Host ""

# ==================== INITIALISATION DE LA BASE DE DONNÉES ====================
Write-Host "🗄️  Initialisation de la base de données..." -ForegroundColor Yellow
Write-Host ""

# Vérifier Docker
Write-Host "  📦 Vérification de Docker..." -ForegroundColor Cyan
$null = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Docker n'est pas démarré. Démarrez Docker Desktop et réessayez." -ForegroundColor Yellow
    Write-Host "  💡 Vous pouvez démarrer PostgreSQL plus tard avec: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
} else {
    Write-Host "  ✅ Docker est actif" -ForegroundColor Green
    
    # Démarrer PostgreSQL
    Write-Host "  🐘 Démarrage de PostgreSQL..." -ForegroundColor Cyan
    docker-compose -f docker-compose.dev.yml up -d
    Start-Sleep -Seconds 5
    
    # Vérifier PostgreSQL
    $null = docker exec sige-postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL est prêt" -ForegroundColor Green
        
        # Générer Prisma Client
        Set-Location "$rootDir\backend"
        Write-Host "  🔨 Génération du client Prisma..." -ForegroundColor Cyan
        npm run db:generate
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Client Prisma généré" -ForegroundColor Green
        }
        
        # Créer les migrations
        Write-Host "  📝 Application des migrations..." -ForegroundColor Cyan
        npm run db:migrate
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Migrations appliquées" -ForegroundColor Green
        }
        
        # Seed la base de données
        Write-Host "  🌱 Peuplement de la base de données..." -ForegroundColor Cyan
        npm run db:seed
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Base de données peuplée" -ForegroundColor Green
        }
        
        Set-Location $rootDir
    } else {
        Write-Host "  ⚠️  PostgreSQL n'est pas encore prêt. Réessayez dans quelques secondes." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Installation terminée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Vérifiez/modifiez le fichier backend/.env si nécessaire" -ForegroundColor White
Write-Host "  2. Utilisez .\dev.ps1 pour démarrer les serveurs de développement" -ForegroundColor White
Write-Host "  3. Ou utilisez .\start-servers.ps1 pour démarrer tous les services" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "  - Backend: http://localhost:5000" -ForegroundColor White
Write-Host "  - Frontend Citoyen: http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend EDG: http://localhost:3002" -ForegroundColor White
Write-Host "  - Frontend État: http://localhost:3003" -ForegroundColor White
Write-Host ""
