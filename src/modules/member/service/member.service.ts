import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EmailService, PrismaService, PermissionService } from '../../common';
import { SecurityConfigService } from '../../config/service/security-config.service';
import * as MemberData from '../model';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

interface SetPasswordPayload extends jwt.JwtPayload {
    userId: number;
    purpose: string;
}

import { CelulaWhereInput, MemberUncheckedCreateInput, MemberWhereInput } from '../../../generated/prisma/models';

// Função auxiliar para limpar datas
function cleanDateField(dateStr: string | undefined): Date | null | undefined {
    if (dateStr === undefined) return undefined;
    if (!dateStr || !dateStr.trim()) return null;
    
    // Se já é uma data válida ISO, adicionar horário para garantir formato completo
    const trimmed = dateStr.trim();
    // Verificar se é apenas data (yyyy-mm-dd) e adicionar hora
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(trimmed + 'T00:00:00.000Z');
    }
    // Se já tem horário, converter para Date
    return new Date(trimmed);
}

@Injectable()
export class MemberService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly securityConfig: SecurityConfigService,
        private readonly permissionService: PermissionService
    ) { }

    public async findAll(filters: { celulaId?: number; discipuladoId?: number; redeId?: number; ministryType?: string }) {
        const where: MemberWhereInput = {};

        // celulaId = 0 significa "sem célula" (celulaId is null)
        if (filters.celulaId !== undefined) {
            if (filters.celulaId === 0) {
                where.celulaId = null;
            } else {
                where.celulaId = filters.celulaId;
            }
        } else {

            const celulaWhere: CelulaWhereInput = {};

            if (filters.discipuladoId) {
                celulaWhere.discipuladoId = filters.discipuladoId;
            }

            if (filters.redeId) {
                celulaWhere.discipulado = {
                    redeId: filters.redeId
                };
            }

            if (Object.keys(celulaWhere).length > 0) {
                where.celula = celulaWhere;
            }
        }

        // Filtrar por tipo de ministério (para selecionar pastores, discipuladores, líderes)
        if (filters.ministryType) {
            const ministryTypes = filters.ministryType.split(',');
            where.ministryPosition = {
                type: { in: ministryTypes as any }
            };
        }

        return this.prisma.member.findMany({
            where,
            include: {
                celula: {
                    include: {
                        discipulado: {
                            include: {
                                rede: true,
                                discipulador: true
                            }
                        }
                    }
                },
                roles: {
                    include: { role: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    public async findByCelula(celulaId: number) {
        return this.prisma.member.findMany({
            where: { celulaId },
            include: {
                roles: {
                    include: { role: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    public async findById(memberId: number) {
        return this.prisma.member.findUnique({
            where: { id: memberId },
            include: {
                celula: true,
                roles: {
                    include: { role: true }
                }
            }
        });
    }

    public async create(body: MemberData.MemberInput, requestingMemberId?: number) {
        // Validar que se hasSystemAccess é true, email é obrigatório
        if (body.hasSystemAccess && (!body.email || !body.email.trim())) {
            throw new HttpException('Email é obrigatório para membros com acesso ao sistema', HttpStatus.BAD_REQUEST);
        }

        // Validar hierarquia ministerial: usuário só pode criar membros com cargos abaixo do seu
        if (body.ministryPositionId && requestingMemberId) {
            await this.validateMinistryHierarchy(requestingMemberId, body.ministryPositionId);
        }

        // Validar cônjuge se casado
        if (body.maritalStatus === 'MARRIED' && body.spouseId) {
            await this.validateAndUpdateSpouse(body.spouseId, null);
        }

        const { roleIds, ...memberData } = body;

        // Se hasSystemAccess é true e não foi fornecida senha, definir senha padrão
        if (memberData.hasSystemAccess && !memberData.password) {
            const defaultPassword = '12345678';
            memberData.password = await bcrypt.hash(defaultPassword, this.securityConfig.bcryptSaltRounds);
        }

        // Converter strings vazias em null para datas e garantir formato ISO-8601 completo
        const cleanedData: any = { ...memberData };
        cleanedData.baptismDate = cleanDateField(memberData.baptismDate);
        cleanedData.birthDate = cleanDateField(memberData.birthDate);
        cleanedData.registerDate = cleanDateField(memberData.registerDate);

        const data: MemberUncheckedCreateInput = cleanedData;

        // Validar que apenas admins podem atribuir roles admin
        if (roleIds && roleIds.length > 0 && requestingMemberId) {
            const rolesBeingAssigned = await this.prisma.role.findMany({
                where: { id: { in: roleIds } }
            });

            const hasAdminRole = rolesBeingAssigned.some(r => r.isAdmin);

            if (hasAdminRole) {
                const requestingPermission = await this.permissionService.loadPermissionForMember(requestingMemberId);
                if (!requestingPermission || !requestingPermission.isAdmin) {
                    throw new HttpException('Apenas administradores podem atribuir roles de administrador', HttpStatus.FORBIDDEN);
                }
            }
        }

        try {
            const member = await this.prisma.member.create({ data });

            // Criar associações de roles se fornecidas
            if (roleIds && roleIds.length > 0) {
                await this.prisma.memberRole.createMany({
                    data: roleIds.map(roleId => ({
                        memberId: member.id,
                        roleId
                    }))
                });
            }

            // Atualizar cônjuge se casado
            if (body.maritalStatus === 'MARRIED' && body.spouseId) {
                await this.updateSpouseMaritalStatus(body.spouseId, member.id);
            }

            return await this.prisma.member.findUnique({
                where: { id: member.id },
                include: {
                    roles: { include: { role: true } },
                    celula: true
                }
            });
        } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002' && 'meta' in error && typeof error.meta === 'object' && error.meta !== null && 'target' in error.meta && Array.isArray(error.meta.target) && error.meta.target.includes('email')) {
                throw new HttpException('Já existe um membro com este email', HttpStatus.BAD_REQUEST);
            }
            throw new HttpException('Falha ao criar membro', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public async update(memberId: number, data: MemberData.MemberInput, requestingMemberId?: number) {
        try {
            const currentMember = await this.prisma.member.findUnique({ where: { id: memberId } });
            
            // Validar que se hasSystemAccess é true, email é obrigatório
            if (data.hasSystemAccess) {
                const finalEmail = data.email !== undefined ? data.email : currentMember?.email;

                if (!finalEmail || !finalEmail.trim()) {
                    throw new HttpException('Email é obrigatório para membros com acesso ao sistema', HttpStatus.BAD_REQUEST);
                }
            }

            // Validar hierarquia ministerial: usuário só pode atualizar cargos para níveis abaixo do seu
            if (data.ministryPositionId !== undefined && requestingMemberId) {
                await this.validateMinistryHierarchy(requestingMemberId, data.ministryPositionId);
            }
            
            // Se está ativando hasSystemAccess e não tinha senha, definir senha padrão
            const wasAccessEnabled = currentMember?.hasSystemAccess;
            const isEnablingAccess = data.hasSystemAccess && !wasAccessEnabled;
            let updatedData = { ...data };
            if (isEnablingAccess && !currentMember?.password) {
                const defaultPassword = '12345678';
                updatedData = { ...updatedData, password: await bcrypt.hash(defaultPassword, this.securityConfig.bcryptSaltRounds) };
            }
            
            // Se email mudou ou está ativando acesso, enviar email de boas-vindas
            const emailChanged = updatedData.email !== undefined && updatedData.email !== currentMember?.email;
            const shouldSendWelcomeEmail = updatedData.hasSystemAccess && (isEnablingAccess || emailChanged);
            if (shouldSendWelcomeEmail && (updatedData.email || currentMember?.email)) {
                const memberEmail = updatedData.email || currentMember?.email;
                const memberName = updatedData.name || currentMember?.name || 'amado(a)';
                await this.sendWelcomeEmail(memberEmail!, memberName);
            }

            // Validar cônjuge se casado
            if (updatedData.maritalStatus === 'MARRIED' && updatedData.spouseId) {
                await this.validateAndUpdateSpouse(updatedData.spouseId, memberId);
            }

            const { roleIds, ...memberData } = updatedData;

            // Converter strings vazias em null para datas e garantir formato ISO-8601 completo
            const cleanedMemberData: any = { ...memberData };
            cleanedMemberData.baptismDate = cleanDateField(memberData.baptismDate);
            cleanedMemberData.birthDate = cleanDateField(memberData.birthDate);
            cleanedMemberData.registerDate = cleanDateField(memberData.registerDate);

            // Validar que apenas admins podem atribuir roles admin
            if (roleIds !== undefined && roleIds.length > 0 && requestingMemberId) {
                const rolesBeingAssigned = await this.prisma.role.findMany({
                    where: { id: { in: roleIds } }
                });

                const hasAdminRole = rolesBeingAssigned.some(r => r.isAdmin);

                if (hasAdminRole) {
                    const requestingPermission = await this.permissionService.loadPermissionForMember(requestingMemberId);
                    if (!requestingPermission || !requestingPermission.isAdmin) {
                        throw new HttpException('Apenas administradores podem atribuir roles de administrador', HttpStatus.FORBIDDEN);
                    }
                }
            }

            await this.prisma.member.update({
                where: { id: memberId },
                data: cleanedMemberData
            });

            // Atualizar roles se fornecidas
            if (roleIds !== undefined) {
                // Remover todas as roles existentes
                await this.prisma.memberRole.deleteMany({
                    where: { memberId }
                });

                // Criar novas associações de roles
                if (roleIds.length > 0) {
                    await this.prisma.memberRole.createMany({
                        data: roleIds.map(roleId => ({
                            memberId,
                            roleId
                        }))
                    });
                }
            }

            // Atualizar cônjuge se casado
            if (data.maritalStatus === 'MARRIED' && data.spouseId) {
                await this.updateSpouseMaritalStatus(data.spouseId, memberId);
            }

            return await this.prisma.member.findUnique({
                where: { id: memberId },
                include: {
                    roles: { include: { role: true } },
                    celula: true
                }
            });
        } catch (err) {
            throw new HttpException(`Falha ao atualizar membro: ${err.message}`, err.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public async removeFromCelula(memberId: number) {
        return this.prisma.member.update({
            where: { id: memberId },
            data: { celulaId: null }
        });
    }

    public async getStatistics(filters: { celulaId?: number; discipuladoId?: number; redeId?: number } = {}) {
        const where: MemberWhereInput = { isActive: true };

        // Aplicar filtros
        if (filters.celulaId !== undefined) {
            if (filters.celulaId === 0) {
                where.celulaId = null;
            } else {
                where.celulaId = filters.celulaId;
            }
        } else {
            const celulaWhere: CelulaWhereInput = {};

            if (filters.discipuladoId) {
                celulaWhere.discipuladoId = filters.discipuladoId;
            }

            if (filters.redeId) {
                celulaWhere.discipulado = {
                    redeId: filters.redeId
                };
            }

            if (Object.keys(celulaWhere).length > 0) {
                where.celula = celulaWhere;
            }
        }

        const members = await this.prisma.member.findMany({
            where,
            include: { celula: true }
        });

        const total = members.length;
        const withoutCelula = members.filter(m => !m.celulaId).length;

        // Gender statistics
        const genderStats = {
            male: members.filter(m => m.gender === 'MALE').length,
            female: members.filter(m => m.gender === 'FEMALE').length,
            other: members.filter(m => m.gender === 'OTHER').length,
            notInformed: members.filter(m => !m.gender).length,
        };

        // Marital status statistics
        const maritalStatusStats = {
            single: members.filter(m => m.maritalStatus === 'SINGLE').length,
            married: members.filter(m => m.maritalStatus === 'MARRIED').length,
            cohabitating: members.filter(m => m.maritalStatus === 'COHABITATING').length,
            divorced: members.filter(m => m.maritalStatus === 'DIVORCED').length,
            widowed: members.filter(m => m.maritalStatus === 'WIDOWED').length,
            notInformed: members.filter(m => !m.maritalStatus).length,
        };

        // Age range statistics
        const now = new Date();
        const ageRanges = {
            '0-17': 0,
            '18-25': 0,
            '26-35': 0,
            '36-50': 0,
            '51-65': 0,
            '65+': 0,
            notInformed: 0,
        };

        members.forEach(m => {
            if (!m.birthDate) {
                ageRanges.notInformed++;
                return;
            }

            const age = Math.floor((now.getTime() - new Date(m.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

            if (age < 18) ageRanges['0-17']++;
            else if (age <= 25) ageRanges['18-25']++;
            else if (age <= 35) ageRanges['26-35']++;
            else if (age <= 50) ageRanges['36-50']++;
            else if (age <= 65) ageRanges['51-65']++;
            else ageRanges['65+']++;
        });

        return {
            total,
            withoutCelula,
            gender: genderStats,
            maritalStatus: maritalStatusStats,
            ageRanges,
        };
    }

    /**
     * Validar se o cônjuge pode ser associado e atualizar
     */
    private async validateAndUpdateSpouse(spouseId: number, currentMemberId: number | null) {
        const spouse = await this.prisma.member.findUnique({
            where: { id: spouseId }
        });

        if (!spouse) {
            throw new HttpException('Cônjuge não encontrado', HttpStatus.BAD_REQUEST);
        }

        // Verificar se o cônjuge já está casado com outra pessoa
        if (spouse.spouseId && spouse.spouseId !== currentMemberId) {
            throw new HttpException('O cônjuge selecionado já está casado com outro membro', HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Atualizar o cônjuge para casado e vincular ao membro atual
     */
    private async updateSpouseMaritalStatus(spouseId: number, memberId: number) {
        await this.prisma.member.update({
            where: { id: spouseId },
            data: {
                maritalStatus: 'MARRIED',
                spouseId: memberId
            }
        });
    }

    /**
     * Send welcome email with login credentials
     */
    private async sendWelcomeEmail(email: string, name: string) {
        const frontend = process.env.FRONTEND_URL;
        if (!frontend) {
            throw new HttpException('Frontend URL não configurada', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const loginLink = `${frontend}/auth/login`;

        try {
            await this.emailService.sendWelcomeEmail(email, loginLink, name, '12345678');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error(`Falha ao enviar email de boas-vindas: ${message}`);
            // Não bloquear o fluxo se o email falhar
        }
    }

    /**
     * Set password using invite token
     */
    public async setPasswordWithToken(token: string, password: string): Promise<MemberData.MemberData> {
        try {
            const payload = jwt.verify(
                token,
                this.securityConfig.jwtSecret,
                { issuer: this.securityConfig.jwtIssuer }
            ) as SetPasswordPayload;
            if (!payload || payload.purpose !== 'set-password') throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
            const userId = payload.userId;
            const hashed = await bcrypt.hash(password, this.securityConfig.bcryptSaltRounds);
            const member = await this.prisma.member.update({ where: { id: userId }, data: { password: hashed, hasDefaultPassword: false } });
            return member;
        } catch (err: unknown) {
            throw new HttpException('Token inválido ou expirado', HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Send a set-password email for existing user (request from user)
     */
    public async requestSetPassword(email: string) {
        const member = await this.prisma.member.findUnique({ where: { email } });
        if (!member) throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);

        const token = jwt.sign(
            { userId: member.id, purpose: 'set-password' },
            this.securityConfig.jwtSecret,
            {
                expiresIn: this.securityConfig.jwtPasswordResetExpiresIn as string,
                issuer: this.securityConfig.jwtIssuer
            } as jwt.SignOptions
        );
        const frontend = process.env.FRONTEND_URL;
        if (!frontend) {
            throw new HttpException('Frontend URL não configurada', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const link = `${frontend}/auth/set-password?token=${token}`;

        try {
            await this.emailService.sendInviteEmail(email, link, `${member.name || 'amado(a)'}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            throw new HttpException(`Falha ao enviar email de convite: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return true;
    }

    /**
     * Authenticate a user and return a JWT token
     *
     * @param data Login credentials
     * @returns JWT token and user data
     */
    public async login(data: MemberData.LoginInput): Promise<MemberData.LoginOutput> {

        const member = await this.prisma.member.findUnique({
            include: {
                viceLedCelulas: true,
                ledCelulas: true,
                discipulados: {
                    include: {
                        celulas: true
                    }
                },
                redes: {
                    include: {
                        discipulados: {
                            include: {
                                celulas: true
                            }
                        }
                    }
                }
            },
            where: { email: data.email }
        });

        if (!member) {
            throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
        }

        // Verificar se o membro tem acesso ao sistema
        if (!member.hasSystemAccess) {
            throw new HttpException('Acesso ao sistema não autorizado', HttpStatus.FORBIDDEN);
        }

        if (!member.password) {
            const token = jwt.sign(
                { 
                    userId: member.id, 
                    purpose: 'set-password' 
                },
                this.securityConfig.jwtSecret,
                {
                    expiresIn: this.securityConfig.jwtPasswordResetExpiresIn as string,
                    issuer: this.securityConfig.jwtIssuer
                } as jwt.SignOptions
            );
            const frontend = process.env.FRONTEND_URL;
            if (!frontend) {
                throw new HttpException('Frontend URL não configurada', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const link = `${frontend}/auth/set-password?token=${token}`;
            return {
                token: '',
                member: member,
                permission: null,
                setPasswordUrl: link
            };
        }

        const isPasswordValid = await bcrypt.compare(data.password, member.password);

        if (!isPasswordValid) {
            throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
        }

        const token = jwt.sign(
            {
                userId: member.id,
                email: member.email
            },
            this.securityConfig.jwtSecret,
            {
                expiresIn: this.securityConfig.jwtExpiresIn as string,
                issuer: this.securityConfig.jwtIssuer
            } as jwt.SignOptions
        );

        return {
            token,
            member: member,
            permission: await this.permissionService.loadSimplifiedPermissionForMember(member.id)
        };
    }

    /**
     * Update own password (authenticated user)
     */
    public async updateOwnPassword(memberId: number, currentPassword: string, newPassword: string) {
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member) {
            throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);
        }
        
        if (!member.password) {
            throw new HttpException('Usuário não tem senha configurada', HttpStatus.BAD_REQUEST);
        }
        
        const isPasswordValid = await bcrypt.compare(currentPassword, member.password);
        if (!isPasswordValid) {
            throw new HttpException('Senha atual incorreta', HttpStatus.UNAUTHORIZED);
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, this.securityConfig.bcryptSaltRounds);
        await this.prisma.member.update({
            where: { id: memberId },
            data: { password: hashedPassword, hasDefaultPassword: false }
        });
        
        return { success: true };
    }
    
    /**
     * Update own email (authenticated user)
     */
    public async updateOwnEmail(memberId: number, newEmail: string) {
        // Verificar se o email já está em uso
        const existing = await this.prisma.member.findUnique({ where: { email: newEmail } });
        if (existing && existing.id !== memberId) {
            throw new HttpException('Este email já está em uso', HttpStatus.BAD_REQUEST);
        }
        
        const member = await this.prisma.member.update({
            where: { id: memberId },
            data: { email: newEmail }
        });
        
        return member;
    }
    
    /**
     * Get own profile (authenticated user)
     */
    public async getOwnProfile(memberId: number) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            include: {
                celula: true,
                roles: { include: { role: true } }
            }
        });
        
        if (!member) {
            throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);
        }
        
        return member;
    }

    /**
     * Validates if the requesting user can assign a ministry position
     * based on hierarchy (user can only assign positions below their own)
     * Admins and pastors can assign any position
     */
    private async validateMinistryHierarchy(requestingMemberId: number, targetMinistryPositionId: number) {
        // Carregar permissões do usuário solicitante
        const requestingPermission = await this.permissionService.loadPermissionForMember(requestingMemberId);
        
        // Admins e pastores podem atribuir qualquer cargo
        if (requestingPermission?.isAdmin || 
            requestingPermission?.ministryType === 'PRESIDENT_PASTOR' || 
            requestingPermission?.ministryType === 'PASTOR') {
            return;
        }
        
        // Se o usuário não tem cargo ministerial, não pode criar membros
        if (!requestingPermission?.ministryPositionId) {
            throw new HttpException('Você não tem permissão para criar membros com cargo ministerial', HttpStatus.FORBIDDEN);
        }
        
        // Buscar os cargos ministeriais
        const [requestingMinistry, targetMinistry] = await Promise.all([
            this.prisma.ministry.findUnique({ where: { id: requestingPermission.ministryPositionId } }),
            this.prisma.ministry.findUnique({ where: { id: targetMinistryPositionId } })
        ]);
        
        if (!requestingMinistry || !targetMinistry) {
            throw new HttpException('Cargo ministerial não encontrado', HttpStatus.BAD_REQUEST);
        }
        
        // Validar hierarquia: priority maior = cargo menor
        // O usuário só pode atribuir cargos com priority MAIOR (menor na hierarquia) que o seu
        if (targetMinistry.priority <= requestingMinistry.priority) {
            throw new HttpException(
                'Você só pode criar membros com cargos abaixo do seu na hierarquia ministerial', 
                HttpStatus.FORBIDDEN
            );
        }
    }

    /**
     * List all members with their admin status and basic role info
     */
    public async findAllWithRoles() {
        const members = await this.prisma.member.findMany({
            include: {
                ledCelulas: true,
                viceLedCelulas: true,
                discipulados: true,
                redes: true,
                roles: {
                    include: { role: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return members.map(u => {
            const isAdmin = u.roles.some(mr => mr.role.isAdmin);
            return {
                member: u,
                isAdmin,
                celulaIds: Array.from(new Set([...(u.ledCelulas || []).map(c => c.id), ...(u.viceLedCelulas || []).map(c => c.id)])),
                roles: u.roles.map(mr => mr.role)
            };
        });
    }
}
