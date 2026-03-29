import {
  Home,
  Users,
  ArrowRight,
  Zap,
  Activity,
  AlertTriangle,
  Wrench,
  Snowflake,
  Battery,
  Clock,
  MessageSquare,
  Settings,
} from 'lucide-react';

export const CITIZEN_PILLARS = [
  {
    id: 'foyer',
    title: 'Foyer & abonnement',
    shortTitle: 'Foyer',
    hint: 'Solde, compteur, autres logements',
    icon: Home,
    tileClass: 'from-primary-500 to-primary-600',
    ringActive: 'ring-primary-500 border-primary-400',
    items: [
      { id: 'overview', label: 'Accueil du foyer', shortLabel: 'Accueil', icon: Home, color: 'primary' },
      { id: 'transfer', label: 'Transfert entre foyers', shortLabel: 'Transfert', icon: ArrowRight, color: 'accent' },
    ],
  },
  {
    id: 'maison',
    title: 'Énergie & boîtier',
    shortTitle: 'Maison',
    hint: 'SIGE, circuits, appareils',
    icon: Zap,
    tileClass: 'from-success-500 to-emerald-600',
    ringActive: 'ring-success-500 border-success-400',
    items: [
      { id: 'pairing', label: 'Brancher mon boîtier', shortLabel: 'Boîtier', icon: Zap, color: 'success' },
      { id: 'smartpanel', label: 'Mes circuits électriques', shortLabel: 'Circuits', icon: Settings, color: 'primary' },
      { id: 'smartsave', label: 'Économies automatiques', shortLabel: 'Économies', icon: Snowflake, color: 'success' },
      { id: 'scheduler', label: 'Heures d’allumage', shortLabel: 'Heures', icon: Clock, color: 'primary' },
      { id: 'economymode', label: 'Moins consommer aux heures chargées', shortLabel: 'Réseau', icon: Battery, color: 'success' },
      { id: 'maintenance', label: 'État de mon installation', shortLabel: 'État', icon: Wrench, color: 'accent' },
      { id: 'analytics', label: 'Conso par appareil', shortLabel: 'Appareils', icon: Activity, color: 'primary' },
    ],
  },
  {
    id: 'famille',
    title: 'Famille',
    shortTitle: 'Famille',
    hint: 'Qui voit quoi',
    icon: Users,
    tileClass: 'from-violet-500 to-purple-600',
    ringActive: 'ring-violet-500 border-violet-400',
    items: [{ id: 'family', label: 'Famille et accès', shortLabel: 'Accès', icon: Users, color: 'primary' }],
  },
  {
    id: 'edg',
    title: 'EDG & confiance',
    shortTitle: 'EDG',
    hint: 'Annonces, signalements',
    icon: MessageSquare,
    tileClass: 'from-amber-500 to-orange-600',
    ringActive: 'ring-amber-500 border-amber-400',
    items: [
      { id: 'edg-messages', label: 'Annonces et infos', shortLabel: 'Annonces', icon: MessageSquare, color: 'success' },
      { id: 'incidents', label: 'Signaler un problème', shortLabel: 'Signaler', icon: AlertTriangle, color: 'accent' },
    ],
  },
];

const SECTION_TO_PILLAR = CITIZEN_PILLARS.reduce((acc, p) => {
  p.items.forEach((it) => {
    acc[it.id] = p.id;
  });
  return acc;
}, {});

export function getPillarIdForSection(sectionId) {
  return SECTION_TO_PILLAR[sectionId] || 'foyer';
}

export function getPillarById(pillarId) {
  return CITIZEN_PILLARS.find((p) => p.id === pillarId) || null;
}

export function getSectionMeta(sectionId) {
  for (const p of CITIZEN_PILLARS) {
    const item = p.items.find((i) => i.id === sectionId);
    if (item) return { pillar: p, item };
  }
  return null;
}
