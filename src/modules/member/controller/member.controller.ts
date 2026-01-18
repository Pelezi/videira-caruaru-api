import { Controller, Get, Post, Body, Param, UseGuards, Req, Delete, Put, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MemberService } from '../service/member.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PermissionService } from '../../common/security/permission.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import * as MemberData from '../model';

@Controller('members')
@ApiTags('membros')
@UseGuards(RestrictedGuard, PermissionGuard)
export class MemberController {
    constructor(
        private readonly service: MemberService,
        private readonly permissionService: PermissionService
    ) {}

    @Get('statistics')
    @ApiOperation({ summary: 'Buscar estatísticas dos membros' })
    @ApiResponse({ status: 200, description: 'Estatísticas dos membros' })
    public async getStatistics(
        @Query('celulaId') celulaId?: string,
        @Query('discipuladoId') discipuladoId?: string,
        @Query('redeId') redeId?: string
    ) {
        const filters: { celulaId?: number; discipuladoId?: number; redeId?: number } = {};
        if (celulaId) filters.celulaId = Number(celulaId);
        if (discipuladoId) filters.discipuladoId = Number(discipuladoId);
        if (redeId) filters.redeId = Number(redeId);
        return this.service.getStatistics(filters);
    }

    @Get(':memberId')
    @ApiOperation({ summary: 'Buscar membro por ID' })
    @ApiResponse({ status: 200, description: 'Dados do membro' })
    @ApiResponse({ status: 404, description: 'Membro não encontrado' })
    public async getById(@Param('memberId') memberIdParam: string) {
        const memberId = Number(memberIdParam);
        const member = await this.service.findById(memberId);
        if (!member) throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);
        return member;
    }

    @Get('')
    @ApiOperation({ summary: 'Listar todos os membros com filtros opcionais' })
    @ApiResponse({ status: 200, description: 'Lista de membros' })
    public async listAll(
        @Req() req: AuthenticatedRequest, 
        @Query('celulaId') celulaId?: string,
        @Query('discipuladoId') discipuladoId?: string,
        @Query('redeId') redeId?: string,
        @Query('ministryType') ministryType?: string
    ) {
        const filters: { celulaId?: number; discipuladoId?: number; redeId?: number; ministryType?: string } = {};
        if (celulaId) filters.celulaId = Number(celulaId);
        if (discipuladoId) filters.discipuladoId = Number(discipuladoId);
        if (redeId) filters.redeId = Number(redeId);
        if (ministryType) filters.ministryType = ministryType;
        
        return this.service.findAll(filters);
    }

    @Get('celulas/:celulaId/members')
    public async list(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string) {
        const permission = req.permission;
        const celulaId = Number(celulaIdParam);
        
        if (!this.permissionService.hasCelulaAccess(permission, celulaId)) {
            throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
        }

        return this.service.findByCelula(celulaId);
    }

    @Post('')
    @ApiOperation({ summary: 'Criar membro' })
    @ApiBody({ type: MemberData.MemberInput })
    @ApiResponse({ status: 201, description: 'Membro criado' })
    public async createWithoutCelula(
        @Req() req: AuthenticatedRequest,
        @Body() body: MemberData.MemberInput
    ) {
        const permission = req.permission;
        
        // Validar que usuário tem permissão para criar membros (admin ou líder)
        if (!permission || (!permission.isAdmin && permission.celulaIds.length === 0)) {
            throw new HttpException('Você não tem permissão para criar membros', HttpStatus.FORBIDDEN);
        }
        
        // Se não for admin e está atribuindo a uma célula, validar acesso à célula
        if (!permission.isAdmin && body.celulaId) {
            if (!this.permissionService.hasCelulaAccess(permission, body.celulaId)) {
                throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
            }
        }

        if (!req.member) {
            throw new HttpException('Requisição não autenticada', HttpStatus.UNAUTHORIZED);
        }
        
        return this.service.create(body, req.member.id);
    }

    @Delete(':memberId')
    @ApiOperation({ summary: 'Remover membro da célula' })
    @ApiResponse({ status: 200, description: 'Membro removido da célula' })
    public async remove(@Req() req: AuthenticatedRequest, @Param('memberId') memberIdParam: string) {
        const permission = req.permission;
        const memberId = Number(memberIdParam);
        const member = await this.service.findById(memberId);
        
        if (!member) {
            throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);
        }
        
        if (member.celulaId && !this.permissionService.hasCelulaAccess(permission, member.celulaId)) {
            throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
        }

        return this.service.removeFromCelula(memberId);
    }

    @Put(':memberId')
    @ApiOperation({ summary: 'Atualizar membro' })
    @ApiResponse({ status: 200, description: 'Membro atualizado' })
    public async update(
        @Req() req: AuthenticatedRequest, 
        @Param('memberId') memberIdParam: string, 
        @Body() body: MemberData.MemberInput
    ) {
        const permission = req.permission;
        const memberId = Number(memberIdParam);
        const member = await this.service.findById(memberId);
        
        if (!member) {
            throw new HttpException('Membro não encontrado', HttpStatus.NOT_FOUND);
        }
        
        if (member.celulaId && !this.permissionService.hasCelulaAccess(permission, member.celulaId)) {
            throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
        }

        if (!req.member) {
            throw new HttpException('Requisição não autenticada', HttpStatus.UNAUTHORIZED);
        }

        return this.service.update(memberId, body, req.member.id);
    }

    @Get('profile/me')
    @ApiOperation({ summary: 'Obter perfil do usuário logado' })
    @ApiResponse({ status: 200, description: 'Perfil do usuário' })
    public async getOwnProfile(@Req() req: AuthenticatedRequest) {
        if (!req.member) {
            throw new HttpException('Requisição não autenticada', HttpStatus.UNAUTHORIZED);
        }
        return this.service.getOwnProfile(req.member.id);
    }

    @Put('profile/password')
    @ApiOperation({ summary: 'Atualizar senha do usuário logado' })
    @ApiResponse({ status: 200, description: 'Senha atualizada' })
    public async updateOwnPassword(
        @Req() req: AuthenticatedRequest,
        @Body() body: { currentPassword: string; newPassword: string }
    ) {
        if (!req.member) {
            throw new HttpException('Requisição não autenticada', HttpStatus.UNAUTHORIZED);
        }
        return this.service.updateOwnPassword(req.member.id, body.currentPassword, body.newPassword);
    }

    @Put('profile/email')
    @ApiOperation({ summary: 'Atualizar email do usuário logado' })
    @ApiResponse({ status: 200, description: 'Email atualizado' })
    public async updateOwnEmail(
        @Req() req: AuthenticatedRequest,
        @Body() body: { email: string }
    ) {
        if (!req.member) {
            throw new HttpException('Requisição não autenticada', HttpStatus.UNAUTHORIZED);
        }
        return this.service.updateOwnEmail(req.member.id, body.email);
    }

    @Post('set-password')
    public async setPassword(@Body() body: { token: string; password: string }) {
        return this.service.setPasswordWithToken(body.token, body.password);
    }

    @Post('request-set-password')
    public async requestSetPassword(@Body() body: { email: string }) {
        return this.service.requestSetPassword(body.email);
    }

    @Get('with-roles')
    @ApiOperation({ summary: 'Listar membros com informações de roles' })
    @ApiResponse({ status: 200, description: 'Lista de membros com roles' })
    public async listWithRoles(@Req() req: AuthenticatedRequest) {
        const permission = req.permission;
        
        try {
            this.permissionService.requireAdmin(permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem acessar esta lista', HttpStatus.FORBIDDEN);
        }
        
        return this.service.findAllWithRoles();
    }

}
