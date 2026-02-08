import { Controller, Post, Body, Get, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from '../member/service/member.service';
import { LoginInput } from '../member/model';
import { RestrictedGuard } from '../common/security/restricted.guard';
import { PermissionService } from '../common/security/permission.service';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { AuthService } from './auth.service';
import { MatrixService } from '../matrix/service/matrix.service';
import { EmailService } from '../common/provider/email.provider';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { SecurityConfigService } from '../config/service/security-config.service';
import { PrismaService } from '../common/provider/prisma.provider';
import * as bcrypt from 'bcrypt';

class RefreshTokenInput {
    refreshToken: string;
}

@Controller('auth')
@ApiTags('auth')
export class AuthController {
    constructor(
        private readonly memberService: MemberService,
        private readonly permissionService: PermissionService,
        private readonly authService: AuthService,
        private readonly matrixService: MatrixService,
        private readonly securityConfig: SecurityConfigService,
        private readonly emailService: EmailService,
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) {}

    @Post('login')
    @ApiOperation({ summary: 'Login de usuário' })
    @ApiBody({ type: LoginInput })
    @ApiResponse({ status: 200, description: 'Retorna token JWT e dados do usuário' })
    public async login(@Request() req: any, @Body() body: LoginInput) {
        // Extract domain from request headers
        const origin = req.headers['origin'];
        
        if (!origin) {
            // Allow login without domain for development/general access
            const res = await this.memberService.login(body);
            return res;
        }
        
        // Pass domain to login service
        const loginData = { ...body, domain: origin };
        const res = await this.memberService.login(loginData);
        return res;
    }

    @Get('refresh')
    @UseGuards(RestrictedGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Atualiza permissões do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Retorna as permissões atualizadas do usuário' })
    public async refreshPermissions(@Request() req: AuthenticatedRequest) {
        if (!req.member) {
            throw new Error('Usuário não autenticado');
        }
        const memberId = req.member.id;
        const member = await this.memberService.findById(memberId);
        const permission = await this.permissionService.loadSimplifiedPermissionForMember(memberId);
        
        // Get matrixId from token
        const authHeader = req.headers['authorization'] as string;
        const currentToken = authHeader?.substring(7);
        let matrixId: number | null = null;
        
        if (currentToken) {
            try {
                const decoded = jwt.verify(currentToken, this.securityConfig.jwtSecret) as any;
                matrixId = decoded.matrixId;
            } catch (error) {
                // Token might be invalid, but continue without matrix info
            }
        }

        // Get user matrices and current matrix
        const userMatrices = await this.matrixService.getMemberMatrices(memberId);
        const currentMatrix = matrixId ? userMatrices.find(m => m.id === matrixId) : null;
        
        return {
            member: member,  // Changed from 'user' to 'member' to match login response
            permission,
            currentMatrix: currentMatrix ? { id: currentMatrix.id, name: currentMatrix.name } : null,
            matrices: userMatrices
        };
    }

    @Post('refresh-token')
    @ApiOperation({ summary: 'Renova o access token usando refresh token' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string', description: 'Refresh token válido' }
            },
            required: ['refreshToken']
        }
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Retorna novo access token e refresh token',
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string' },
                refreshToken: { type: 'string' },
                member: { type: 'object' },
                permission: { type: 'object' },
                currentMatrix: { type: 'object' },
                matrices: { type: 'array' }
            }
        }
    })
    public async refreshToken(@Request() req: AuthenticatedRequest, @Body() body: RefreshTokenInput) {
        if (!body.refreshToken) {
            throw new HttpException('Refresh token não fornecido', HttpStatus.BAD_REQUEST);
        }

        try {
            // Validate refresh token and get user ID
            const userId = await this.authService.validateRefreshToken(body.refreshToken);

            // Get user data
            const member = await this.memberService.findById(userId);
            if (!member) {
                throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
            }

            // Get matrixId from current token to preserve it
            const authHeader = req.headers['authorization'] as string;
            const currentToken = authHeader?.substring(7);
            let matrixId: number;
            
            if (currentToken) {
                const decoded = jwt.verify(currentToken, this.securityConfig.jwtSecret) as any;
                matrixId = decoded.matrixId;
            } else {
                throw new HttpException('Token não encontrado', HttpStatus.UNAUTHORIZED);
            }

            // Verify user still has access to this matrix
            const userMatrices = await this.matrixService.getMemberMatrices(userId);
            const hasAccess = userMatrices.some(m => m.id === matrixId);
            
            if (!hasAccess) {
                throw new HttpException('Acesso à matriz foi revogado. Por favor, faça login novamente.', HttpStatus.FORBIDDEN);
            }

            // Generate new access token with matrixId
            const newAccessToken = this.authService.generateAccessToken(userId, matrixId, member.email || undefined);

            // Generate new refresh token (rotate)
            const newRefreshToken = await this.authService.generateRefreshToken(userId);

            // Revoke old refresh token
            await this.authService.revokeRefreshToken(body.refreshToken);

            // Get user permissions
            const permission = await this.permissionService.loadSimplifiedPermissionForMember(userId);

            // Get current matrix info
            const currentMatrix = userMatrices.find(m => m.id === matrixId);

            return {
                token: newAccessToken,
                refreshToken: newRefreshToken,
                member: member,  // Changed from 'user' to 'member' to match login response
                permission,
                currentMatrix: currentMatrix ? { id: currentMatrix.id, name: currentMatrix.name } : null,
                matrices: userMatrices,
                requireMatrixSelection: false
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Falha ao renovar token', HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('logout')
    @UseGuards(RestrictedGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Faz logout do usuário revogando o refresh token' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string', description: 'Refresh token para revogar' }
            }
        },
        required: false
    })
    @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
    public async logout(@Request() req: AuthenticatedRequest, @Body() body?: { refreshToken?: string }) {
        if (!req.member) {
            throw new Error('Usuário não autenticado');
        }

        // If refresh token provided, revoke it specifically
        if (body?.refreshToken) {
            await this.authService.revokeRefreshToken(body.refreshToken);
        } else {
            // Otherwise revoke all tokens for this user
            await this.authService.revokeAllUserTokens(req.member.id);
        }

        return {
            success: true,
            message: 'Logout realizado com sucesso'
        };
    }

    @Post('select-matrix')
    @ApiOperation({ summary: 'Seleciona uma matriz para login quando usuário tem múltiplas matrizes' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string', description: 'Token temporário de seleção de matriz' },
                matrixId: { type: 'number', description: 'ID da matriz selecionada' }
            },
            required: ['token', 'matrixId']
        }
    })
    @ApiResponse({ status: 200, description: 'Retorna token JWT completo para a matriz selecionada' })
    public async selectMatrix(@Body() body: { token: string; matrixId: number }) {
        try {
            // Validar token temporário
            const decoded = jwt.verify(body.token, this.securityConfig.jwtSecret) as any;
            
            if (decoded.purpose !== 'matrix-selection') {
                throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
            }

            const userId = decoded.userId;

            // Buscar usuário e suas matrizes
            const member = await this.memberService.findById(userId);
            if (!member) {
                throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
            }

            // Verificar se o usuário tem acesso à matriz selecionada
            const userMatrices = await this.matrixService.getMemberMatrices(userId);
            const selectedMatrix = userMatrices.find(m => m.id === body.matrixId);

            if (!selectedMatrix) {
                throw new HttpException('Usuário não tem acesso a esta matriz', HttpStatus.UNAUTHORIZED);
            }

            // Gerar token completo com matrixId
            const token = jwt.sign(
                {
                    userId: member.id,
                    email: member.email,
                    matrixId: selectedMatrix.id
                },
                this.securityConfig.jwtSecret,
                {
                    expiresIn: this.securityConfig.jwtExpiresIn as string,
                    issuer: this.securityConfig.jwtIssuer
                } as jwt.SignOptions
            );

            // Gerar refresh token
            const refreshToken = await this.authService.generateRefreshToken(member.id);

            // Buscar permissões
            const permission = await this.permissionService.loadSimplifiedPermissionForMember(member.id);

            return {
                token,
                refreshToken,
                member,
                permission,
                currentMatrix: { id: selectedMatrix.id, name: selectedMatrix.name },
                matrices: userMatrices
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Token inválido ou expirado', HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Solicita redefinição de senha' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'Email do usuário' }
            },
            required: ['email']
        }
    })
    @ApiResponse({ status: 200, description: 'Email de redefinição enviado com sucesso' })
    public async forgotPassword(@Request() req: any, @Body() body: { email: string }) {
        try {
            const { email } = body;
            
            if (!email || !email.trim()) {
                throw new HttpException('Email é obrigatório', HttpStatus.BAD_REQUEST);
            }

            // Find member by email
            const member = await this.prisma.member.findUnique({
                where: { email: email.toLowerCase().trim() },
                include: {
                    matrices: {
                        include: {
                            matrix: {
                                include: {
                                    domains: true
                                }
                            }
                        }
                    }
                }
            });

            // Always return success even if user doesn't exist (security best practice)
            // This prevents email enumeration attacks
            if (!member) {
                return {
                    success: true,
                    message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
                };
            }

            // Generate reset token
            const resetToken = await this.authService.generatePasswordResetToken(member.id);

            // Get origin from request to build reset link
            const origin = req.headers['origin'] || process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetLink = `${origin}/auth/reset-password?token=${resetToken}`;

            // Get matrix name from the first matrix the user belongs to
            const matrixName = member.matrices && member.matrices.length > 0 
                ? member.matrices[0].matrix.name 
                : '';

            // Send email
            await this.emailService.sendPasswordResetEmail(member.email!, resetLink, member.name, matrixName);

            // Send WhatsApp if phone exists
            if (member.phone && member.phone.trim()) {
                try {
                    const whatsappApiUrl = process.env.WHATSAPP_MANAGER_API;
                    if (whatsappApiUrl) {
                        // Use the same matrixName or fallback
                        const whatsappMatrixName = matrixName || 'Portal Uvas';

                        const params = new URLSearchParams({
                            to: member.phone,
                            name: member.name,
                            platform_name: whatsappMatrixName,
                            password_reset_url: resetLink
                        });

                        const url = `${whatsappApiUrl}/conversations/passwordReset?${params.toString()}`;

                        await firstValueFrom(
                            this.httpService.post(url, null, {
                                headers: { 'accept': '*/*' }
                            })
                        );

                        console.log(`WhatsApp de redefinição de senha enviado com sucesso para ${member.phone}`);
                    }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Erro desconhecido';
                    console.error(`Falha ao enviar WhatsApp de redefinição de senha: ${message}`);
                    // Não bloquear o fluxo se o WhatsApp falhar
                }
            }

            return {
                success: true,
                message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
            };
        } catch (error) {
            console.error('Error in forgot-password:', error);
            // Return generic message to avoid leaking information
            return {
                success: true,
                message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
            };
        }
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Redefine a senha usando token' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string', description: 'Token de redefinição de senha' },
                newPassword: { type: 'string', description: 'Nova senha' }
            },
            required: ['token', 'newPassword']
        }
    })
    @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
    public async resetPassword(@Body() body: { token: string; newPassword: string }) {
        const { token, newPassword } = body;
        
        if (!token || !newPassword) {
            throw new HttpException('Token e nova senha são obrigatórios', HttpStatus.BAD_REQUEST);
        }

        if (newPassword.length < 6) {
            throw new HttpException('A senha deve ter no mínimo 6 caracteres', HttpStatus.BAD_REQUEST);
        }

        try {
            // Validate token and get member ID
            const memberId = await this.authService.validatePasswordResetToken(token);

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update member password
            await this.prisma.member.update({
                where: { id: memberId },
                data: { 
                    password: hashedPassword,
                    hasDefaultPassword: false
                }
            });

            // Mark token as used
            await this.authService.markPasswordResetTokenAsUsed(token);

            return {
                success: true,
                message: 'Senha redefinida com sucesso'
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Erro ao redefinir senha', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
