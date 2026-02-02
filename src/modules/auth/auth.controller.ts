import { Controller, Post, Body, Get, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from '../member/service/member.service';
import { LoginInput } from '../member/model';
import { RestrictedGuard } from '../common/security/restricted.guard';
import { PermissionService } from '../common/security/permission.service';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { AuthService } from './auth.service';
import { MatrixService } from '../matrix/service/matrix.service';
import * as jwt from 'jsonwebtoken';
import { SecurityConfigService } from '../config/service/security-config.service';

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
        
        return {
            user: member,
            permission
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
                user: { type: 'object' },
                permission: { type: 'object' }
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

            return {
                token: newAccessToken,
                refreshToken: newRefreshToken,
                user: member,
                permission
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
}
