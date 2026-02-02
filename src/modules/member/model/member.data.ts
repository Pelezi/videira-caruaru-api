import { ApiProperty } from '@nestjs/swagger';
import { Gender, MaritalStatus } from '../../../generated/prisma/enums';

export class MemberInput {
    // Auth/User fields
    @ApiProperty({ description: 'Email address', example: 'user@example.com', required: false })
    public readonly email?: string;

    @ApiProperty({ description: 'Password', example: 'password123', required: false })
    public readonly password?: string;

    // Member fields
    @ApiProperty({ description: 'Member name', example: 'Maria Silva', required: false })
    public readonly name: string;

    @ApiProperty({ description: 'Marital status', example: 'SINGLE', required: false })
    public readonly maritalStatus?: MaritalStatus;

    @ApiProperty({ description: 'Photo URL', example: 'https://...', required: false })
    public readonly photoUrl?: string;

    @ApiProperty({ description: 'Phone number', example: '+5511999999999', required: false })
    public readonly phone?: string;

    @ApiProperty({ description: 'Gender', example: 'MALE', required: false })
    public readonly gender?: Gender;

    @ApiProperty({ description: 'Is baptized', example: true, required: false })
    public readonly isBaptized?: boolean;

    @ApiProperty({ description: 'Baptism date', example: '2023-01-15', required: false })
    public readonly baptismDate?: string;

    @ApiProperty({ description: 'Birth date', example: '1990-05-20', required: false })
    public readonly birthDate?: string;

    @ApiProperty({ description: 'Register date', example: '2024-01-01', required: false })
    public readonly registerDate?: string;

    @ApiProperty({ description: 'Spouse member ID (for married members)', example: 1, required: false })
    public readonly spouseId?: number;

    @ApiProperty({ description: 'Ministry position ID', example: 1, required: false })
    public readonly ministryPositionId?: number;

    @ApiProperty({ description: 'Winner path ID', example: 1, required: false })
    public readonly winnerPathId?: number;

    @ApiProperty({ description: 'Can be host', example: true, required: false })
    public readonly canBeHost?: boolean;

    @ApiProperty({ description: 'Country', example: 'Brasil', required: false })
    public readonly country?: string;

    @ApiProperty({ description: 'ZIP code', example: '12345-678', required: false })
    public readonly zipCode?: string;

    @ApiProperty({ description: 'Street', example: 'Rua Principal', required: false })
    public readonly street?: string;

    @ApiProperty({ description: 'Street number', example: '123', required: false })
    public readonly streetNumber?: string;

    @ApiProperty({ description: 'Neighborhood', example: 'Centro', required: false })
    public readonly neighborhood?: string;

    @ApiProperty({ description: 'City', example: 'São Paulo', required: false })
    public readonly city?: string;

    @ApiProperty({ description: 'Complement', example: 'Apto 101', required: false })
    public readonly complement?: string;

    @ApiProperty({ description: 'State', example: 'SP', required: false })
    public readonly state?: string;

    @ApiProperty({ description: 'Has system access', example: false, required: false })
    public readonly hasSystemAccess?: boolean;

    @ApiProperty({ description: 'Has default password (123456)', example: true, required: false })
    public readonly hasDefaultPassword?: boolean;

    @ApiProperty({ description: 'Is active in church', example: true, required: false })
    public readonly isActive?: boolean;

    @ApiProperty({ description: 'Celula ID', example: 1, required: false })
    public readonly celulaId?: number;

    @ApiProperty({ description: 'Role IDs to assign to member', example: [1, 2], required: false, type: [Number] })
    public readonly roleIds?: number[];
}

export class LoginInput {
    @ApiProperty({ description: 'Email address', example: 'user@example.com' })
    public readonly email: string;

    @ApiProperty({ description: 'Password', example: 'password123' })
    public readonly password: string;

    // Domain is extracted from request headers on the server side
    public readonly domain?: string;
}

export class MemberData {
    @ApiProperty({ description: 'ID unico do usuário', example: 1 })
    public readonly id: number;
}

export class MemberPermissions {
    @ApiProperty({ description: 'Indicativo se é Líder em treinmaneto', example: false })
    public readonly viceLeader: boolean;

    @ApiProperty({ description: 'Indicativo se é Líder', example: false })
    public readonly leader: boolean;

    @ApiProperty({ description: 'Indicativo se é Discipulador', example: false })
    public readonly discipulador: boolean;

    @ApiProperty({ description: 'Indicativo se é Pastor', example: false })
    public readonly pastor: boolean;

    @ApiProperty({ description: 'IDs das células associadas ao membro', example: [1, 2, 3], required: false })
    public readonly celulaIds?: number[] | null;

}

export class InviteResponse {
    @ApiProperty({ description: 'Indica se a operação foi bem-sucedida', example: true })
    public readonly success: boolean;

    @ApiProperty({ description: 'Mensagem descritiva do resultado', example: 'Convite enviado no email e WhatsApp' })
    public readonly message: string;

    @ApiProperty({ description: 'Indica se o convite foi enviado via WhatsApp', example: true })
    public readonly whatsappSent: boolean;
}

export class LoginOutput {

    @ApiProperty({ description: 'JWT token para autenticação', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    public readonly token: string;

    @ApiProperty({ description: 'Refresh token para renovação de acesso', example: 'a1b2c3d4...', required: false })
    public readonly refreshToken?: string;

    @ApiProperty({ description: 'Dados do membro autenticado' })
    public readonly member: MemberData;

    @ApiProperty({ description: 'Permissões do membro', required: false })
    public readonly permission?: MemberPermissions | null;

    @ApiProperty({ description: 'URL para definir a senha (se aplicável)', example: 'https://frontend-url/auth/set-password?token=...', required: false })
    public readonly setPasswordUrl?: string;

    @ApiProperty({ description: 'Lista de matrizes que o usuário tem acesso', required: false })
    public readonly matrices?: Array<{ id: number; name: string; domains: Array<{ domain: string }> }>;

    @ApiProperty({ description: 'Matriz atual do login', required: false })
    public readonly currentMatrix?: { id: number; name: string };

    @ApiProperty({ description: 'Indica se o usuário deve escolher uma matriz', required: false })
    public readonly requireMatrixSelection?: boolean;
}