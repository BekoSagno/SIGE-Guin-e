# 🚀 État des Services SIGE-Guinée

**Date :** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## ✅ Services Actifs

| Service | Port | Status | URL |
|---------|------|--------|-----|
| **PostgreSQL** | 5432 | ✅ Actif | `localhost:5432` |
| **Backend API** | 5000 | ✅ Actif | http://localhost:5000 |
| **Frontend Citoyen** | 3001 | ✅ Actif | http://localhost:3001 |
| **Frontend EDG** | 3002 | ✅ Actif | http://localhost:3002 |
| **Frontend État** | 3003 | ✅ Actif | http://localhost:3003 |

## 📋 Informations Utiles

### Comptes de Test

- **Citoyen** : `mamadou@test.com` / `password123`
- **Agent EDG** : `agent@edg.gn` / `password123`
- **Admin État** : `admin@energie.gn` / `password123`

### Endpoints API Principaux

- **Health Check** : http://localhost:5000/api/health
- **Documentation API** : http://localhost:5000/api/routes
- **Authentification** : http://localhost:5000/api/auth/login

## 🔍 Vérification Rapide

Pour vérifier l'état des services :
```powershell
.\dev.ps1 status
```

Pour arrêter tous les services :
```powershell
.\dev.ps1 stop
```

## 📝 Notes

- Les services sont démarrés dans des fenêtres PowerShell séparées
- Le backend redémarre automatiquement lors des modifications (--watch)
- Les frontends utilisent Vite avec Hot Module Replacement (HMR)
