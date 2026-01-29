# Méthodologie de Développement - SIGE-Guinée

## 🔍 Règle d'Or : Vérification Avant Modification

**TOUJOURS vérifier l'existence d'un système/fonctionnalité avant de :**
- Créer un nouveau code
- Améliorer une fonctionnalité existante
- Ajouter une nouvelle route API
- Créer un nouveau composant frontend

## 📋 Processus Obligatoire

### 1. Recherche et Analyse
Avant toute modification, effectuer :
- ✅ Recherche sémantique dans le codebase (`codebase_search`)
- ✅ Recherche par mots-clés (`grep`)
- ✅ Lecture des fichiers existants pertinents
- ✅ Vérification des schémas de base de données
- ✅ Consultation de la documentation existante

### 2. Vérification des Duplications
- ✅ Identifier si une fonctionnalité similaire existe déjà
- ✅ Vérifier les patterns de code existants
- ✅ S'assurer de la cohérence avec l'architecture actuelle
- ✅ Éviter de créer des routes/composants redondants

### 3. Amélioration vs Création
- **Si existe** : Améliorer et étendre le code existant
- **Si n'existe pas** : Créer en respectant les patterns existants
- **Si partiellement implémenté** : Compléter plutôt que dupliquer

## 🎯 Objectifs

1. **Cohérence** : Maintenir un style et une architecture uniformes
2. **Maintenabilité** : Éviter le code dupliqué pour faciliter la maintenance
3. **Performance** : Réutiliser le code existant plutôt que de le réécrire
4. **Qualité** : S'assurer que chaque modification s'intègre harmonieusement

## ⚠️ Signaux d'Alerte

Si vous remarquez :
- Code similaire dans plusieurs fichiers
- Fonctions qui font la même chose
- Routes API redondantes
- Composants frontend avec logique dupliquée

→ **ARRÊTER** et analyser avant de continuer

## 📝 Checklist Avant Modification

- [ ] Recherche sémantique effectuée
- [ ] Fichiers existants lus et compris
- [ ] Pas de duplication identifiée
- [ ] Patterns existants respectés
- [ ] Architecture cohérente maintenue
- [ ] Tests de non-régression possibles

---

**Date de création** : 2025-01-22  
**Dernière mise à jour** : 2025-01-22
