import { $Enums } from '../../../generated/prisma/client';

/**
 * Helper functions to check permissions based on ministry type
 */

export function canBePastor(ministryType?: $Enums.MinistryType | null): boolean {
    if (!ministryType) return false;
    return (
        ministryType === $Enums.MinistryType.PRESIDENT_PASTOR ||
        ministryType === $Enums.MinistryType.PASTOR
    );
}

export function canBeDiscipulador(ministryType?: $Enums.MinistryType | null): boolean {
    if (!ministryType) return false;
    return (
        ministryType === $Enums.MinistryType.PRESIDENT_PASTOR ||
        ministryType === $Enums.MinistryType.PASTOR ||
        ministryType === $Enums.MinistryType.DISCIPULADOR
    );
}

export function canBeLeader(ministryType?: $Enums.MinistryType | null): boolean {
    if (!ministryType) return false;
    return (
        ministryType === $Enums.MinistryType.PRESIDENT_PASTOR ||
        ministryType === $Enums.MinistryType.PASTOR ||
        ministryType === $Enums.MinistryType.DISCIPULADOR ||
        ministryType === $Enums.MinistryType.LEADER
    );
}

export function canBeViceLeader(ministryType?: $Enums.MinistryType | null): boolean {
    if (!ministryType) return false;
    return (
        ministryType === $Enums.MinistryType.PRESIDENT_PASTOR ||
        ministryType === $Enums.MinistryType.PASTOR ||
        ministryType === $Enums.MinistryType.DISCIPULADOR ||
        ministryType === $Enums.MinistryType.LEADER ||
        ministryType === $Enums.MinistryType.LEADER_IN_TRAINING
    );
}

export function getMinistryTypeLabel(type?: $Enums.MinistryType | null): string {
    const labels: Record<$Enums.MinistryType, string> = {
        [$Enums.MinistryType.PRESIDENT_PASTOR]: 'Pastor Presidente',
        [$Enums.MinistryType.PASTOR]: 'Pastor',
        [$Enums.MinistryType.DISCIPULADOR]: 'Discipulador',
        [$Enums.MinistryType.LEADER]: 'Líder',
        [$Enums.MinistryType.LEADER_IN_TRAINING]: 'Líder em Treinamento',
        [$Enums.MinistryType.MEMBER]: 'Membro',
        [$Enums.MinistryType.REGULAR_ATTENDEE]: 'Frequentador Assíduo',
        [$Enums.MinistryType.VISITOR]: 'Visitante',
    };
    return type ? labels[type] : 'Membro';
}

/**
 * Get minimum required ministry type for a specific role
 */
export function getMinimumMinistryTypeFor(role: 'pastor' | 'discipulador' | 'leader' | 'viceLeader'): $Enums.MinistryType {
    const requirements = {
        pastor: $Enums.MinistryType.PASTOR,
        discipulador: $Enums.MinistryType.DISCIPULADOR,
        leader: $Enums.MinistryType.LEADER,
        viceLeader: $Enums.MinistryType.LEADER_IN_TRAINING,
    };
    return requirements[role];
}
