# Script pour résoudre le problème de connexion PostgreSQL
Write-Host "🔧 Correction de la configuration PostgreSQL..."

# Arrêter et supprimer le conteneur
Write-Host "Arrêt du conteneur..."
docker-compose -f ../docker-compose.dev.yml down -v

# Redémarrer
Write-Host "Redémarrage du conteneur..."
docker-compose -f ../docker-compose.dev.yml up -d

# Attendre que PostgreSQL soit prêt
Write-Host "Attente du démarrage de PostgreSQL..."
Start-Sleep -Seconds 15

# Vérifier la connexion
Write-Host "Test de connexion..."
docker exec sige-postgres psql -U postgres -c "SELECT version();"

Write-Host "✅ PostgreSQL est prêt !"
Write-Host "Vous pouvez maintenant exécuter: npm run db:push"
