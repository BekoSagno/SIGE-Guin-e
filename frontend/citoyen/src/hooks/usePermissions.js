import { useState, useEffect } from 'react';
import { familyService } from '@common/services';

/**
 * Hook pour gérer les permissions d'un utilisateur dans un foyer
 * @param {string} homeId - ID du foyer
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} isOwner - Si l'utilisateur est propriétaire
 * @returns {object} - Permissions et rôle de l'utilisateur
 */
export function usePermissions(homeId, userId, isOwner) {
  const [userRole, setUserRole] = useState(isOwner ? 'ADMIN' : 'MEMBER');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canManageMembers: false,
    canTransfer: false,
    canViewFinancials: true,
    canControlDevices: false,
    canViewDetailedAnalytics: true,
    canConfigureHome: false,
    canViewAllDevices: true,
  });

  useEffect(() => {
    if (homeId && userId) {
      loadUserRole();
    } else {
      setLoading(false);
    }
  }, [homeId, userId, isOwner]);

  const loadUserRole = async () => {
    try {
      if (isOwner) {
        setUserRole('ADMIN');
        setPermissions({
          canManageMembers: true,
          canTransfer: true,
          canViewFinancials: true,
          canControlDevices: true,
          canViewDetailedAnalytics: true,
          canConfigureHome: true,
          canViewAllDevices: true,
        });
      } else {
        // Récupérer le rôle depuis les membres
        const data = await familyService.getMembers(homeId);
        const member = data.members?.find((m) => m.id === userId);
        
        if (member) {
          const role = member.role || 'MEMBER';
          setUserRole(role);
          
          // Définir les permissions selon le rôle
          if (role === 'ADMIN') {
            setPermissions({
              canManageMembers: true,
              canTransfer: true,
              canViewFinancials: true,
              canControlDevices: true,
              canViewDetailedAnalytics: true,
              canConfigureHome: true,
              canViewAllDevices: true,
            });
          } else if (role === 'MEMBER') {
            setPermissions({
              canManageMembers: false,
              canTransfer: false,
              canViewFinancials: false,
              canControlDevices: true, // Peut contrôler sauf haut risque
              canViewDetailedAnalytics: true,
              canConfigureHome: false,
              canViewAllDevices: true,
            });
          } else if (role === 'CHILD') {
            setPermissions({
              canManageMembers: false,
              canTransfer: false,
              canViewFinancials: false,
              canControlDevices: false, // Seulement éclairage
              canViewDetailedAnalytics: false, // Vue limitée
              canConfigureHome: false,
              canViewAllDevices: false, // Vue limitée
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si un appareil peut être contrôlé par l'utilisateur
  const canControlDevice = (deviceType, devicePower) => {
    if (!permissions.canControlDevices) {
      return false;
    }

    // Si CHILD, seulement éclairage
    if (userRole === 'CHILD') {
      return deviceType?.toLowerCase().includes('lamp') || 
             deviceType?.toLowerCase().includes('light') ||
             deviceType?.toLowerCase().includes('éclairage');
    }

    // Si MEMBER, exclure les appareils à haut risque
    if (userRole === 'MEMBER') {
      const highRiskDevices = ['AC', 'CLIM', 'CLIMATISEUR', 'FRIGO', 'REFRIGERATOR', 'POMPE', 'PUMP'];
      const isHighRisk = highRiskDevices.some(risk => 
        deviceType?.toUpperCase().includes(risk)
      );
      const isHighPower = (devicePower || 0) > 2000; // Plus de 2kW
      
      return !isHighRisk && !isHighPower;
    }

    // ADMIN peut tout contrôler
    return true;
  };

  return {
    userRole,
    permissions,
    loading,
    canControlDevice,
  };
}
