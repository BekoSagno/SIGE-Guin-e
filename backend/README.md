# Backend SIGE-Guinée

## Installation

### Prérequis
- Node.js 18+
- PostgreSQL 16+ (ou Docker)
- npm ou yarn

### Étapes

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

3. **Démarrer PostgreSQL (avec Docker)**
```bash
docker-compose -f ../docker-compose.dev.yml up -d
```

4. **Générer le client Prisma**
```bash
npm run db:generate
```

5. **Créer les migrations**
```bash
npm run db:migrate
```

6. **Peupler la base de données (seed)**
```bash
npm run db:seed
```

7. **Démarrer le serveur**
```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:5000`

## Comptes de test (après seed)

- **Citoyen**: mamadou@test.com / password123
- **Agent EDG**: agent@edg.gn / password123
- **Admin État**: admin@energie.gn / password123

## Commandes utiles

- `npm run db:studio` - Ouvrir Prisma Studio (interface graphique)
- `npm run db:migrate` - Créer une nouvelle migration
- `npm run db:push` - Pousser le schéma sans migration (dev uniquement)

## Structure de la base de données

- **Users**: Utilisateurs avec rôles (CITOYEN, AGENT_EDG, ADMIN_ETAT)
- **Homes**: Foyers avec types (EDG, SOLAIRE, HYBRIDE)
- **Meters**: Kits IoT connectés
- **EnergyData**: Données temporelles de consommation
- **Incidents**: Signalements citoyens
- **Financial**: Soldes et budgets des foyers
- **NILMSignature**: Signatures d'appareils détectés
- **LoadSheddingEvent**: Historique des délestages
