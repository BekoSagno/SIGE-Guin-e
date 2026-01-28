Guide des Prompts Full-Stack (Cursor / Windsurf)

Note : Utilisez ces prompts dans l'ordre. Assurez-vous d'avoir Docker installé pour PostgreSQL.

Étape 1 : Setup du Backend et PostgreSQL (Prisma)

"Initialise un projet Backend avec Node.js, Express et Prisma ORM. Configure un schéma PostgreSQL pour le projet SIGE-Guinée incluant les tables : Users (avec rôles), Homes, Meters (Kits IoT), EnergyData (séries temporelles), et Incidents.
Génère les migrations Prisma et crée un script de 'seed' pour peupler la base avec des zones de Conakry (Dixinn, Kaloum) et des utilisateurs tests."

Étape 2 : API de Télémétrie et Sécurité

"Crée un système d'authentification robuste avec JWT. Implémente un middleware de protection des routes par rôle.
Développe l'API POST /api/energy/telemetry qui reçoit les données de puissance, tension et courant des kits IoT.
Ajoute une logique backend qui détecte automatiquement une 'Suspicion de Fraude' si la puissance consommée dépasse l'index du compteur de plus de 15%."

Étape 3 : Architecture Frontend et Services

"Crée une application React (Vite) avec Tailwind CSS. Installe axios pour les appels API et recharts pour les graphiques.
Structure le frontend avec des services (authService.js, energyService.js) qui communiquent avec le backend créé précédemment.
Implémente un layout professionnel avec une sidebar pour naviguer entre les vues : Usager, EDG et État."

Étape 4 : Dashboard Usager et Logique NILM (Full-Stack)

"Développe la vue Usager. Elle doit consommer l'API pour afficher le solde GNF réel et l'historique de consommation.
Crée un composant DeviceAnalytics qui liste les appareils identifiés par le kit IoT (reçu via le backend).
Ajoute une interaction en temps réel : si le backend reçoit une commande de délestage, le dashboard doit afficher une alerte 'Mode Économie Réseau activé par EDG'."

Étape 5 : Dashboard EDG - Centre de Commande Réseau

"Développe la vue Superviseur EDG. Elle doit afficher une carte (Leaflet ou Mapbox) avec les foyers connectés.
Implémente le bouton 'Délestage Intelligent' qui appelle l'API backend pour envoyer une commande MQTT (simulée) aux boîtiers d'une zone.
Crée une table de monitoring des pertes réseau calculant Énergie Injectée vs Énergie Recouvrée par quartier."

Étape 6 : Dashboard Ministère - Pilotage de Souveraineté

"Développe la vue Ministérielle. Utilise des agrégations SQL complexes via le backend pour afficher :

Le déficit financier national (Coût Achat vs Recettes).

Le rendement de distribution par ville.

L'impact social (nb d'hôpitaux et écoles ravitailés).
Ajoute un générateur de rapport PDF automatique résumant les gains réalisés grâce à la lutte contre la fraude."

Étape 7 : Déploiement (Dockerization)

"Crée un fichier docker-compose.yml pour orchestrer l'application complète : un container pour le Frontend (Nginx), un pour le Backend (Node.js), un pour PostgreSQL et un pour un broker MQTT (Mosquitto). Configure les variables d'environnement pour la production."