import { Controller, Get, Post, Body, Param, UseGuards, Req, Put, HttpException, Delete, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CelulaService } from '../service/celula.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PrismaService } from '../../common';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import { CelulaCreateInput, CelulaUpdateInput, CelulaMultiplyInput } from '../model/celula.input';

@Controller('celulas')
@ApiTags('celulas')
export class CelulaController {
    constructor(private readonly service: CelulaService, private readonly prisma: PrismaService) {}

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get()
    public async find(@Req() req: AuthenticatedRequest) {
        const permission = req.permission;
        if (!permission) throw new HttpException('Você não tem permissão', HttpStatus.UNAUTHORIZED);
        
        if (permission.isAdmin) {
            return this.service.findAll();
        }

        return this.service.findByPermission(permission.celulaIds);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Post()
    @ApiOperation({ summary: 'Criar uma nova célula' })
    @ApiBody({ type: CelulaCreateInput })
    @ApiResponse({ status: 201, description: 'Célula criada' })
    public async create(@Req() req: AuthenticatedRequest, @Body() body: CelulaCreateInput) {
        const permission = req.permission;
        if (!permission) throw new HttpException('Sem permissão', HttpStatus.UNAUTHORIZED);
        
        // Verificar se pode criar célula no discipulado especificado
        if (body.discipuladoId && !permission.isAdmin) {
            const discipulado = await this.prisma.discipulado.findUnique({
                where: { id: body.discipuladoId },
                include: { rede: true }
            });
            
            if (!discipulado) {
                throw new HttpException('Discipulado não encontrado', 404);
            }
            
            // Verificar se é discipulador do discipulado ou pastor da rede
            const canCreate = permission.discipuladoIds.includes(body.discipuladoId) || 
                            permission.redeIds.includes(discipulado.redeId);
            
            if (!canCreate) {
                throw new HttpException('Você não tem permissão para criar células neste discipulado', HttpStatus.FORBIDDEN);
            }
        }

        return this.service.create(body);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get(':id')
    public async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        const permission = req.permission;
        const celulaId = Number(id);
        
        if (!permission?.isAdmin && !permission?.celulaIds.includes(celulaId)) {
            throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
        }

        return this.service.findById(celulaId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get(':id/members')
    @ApiOperation({ summary: 'Listar membros de uma célula' })
    @ApiResponse({ status: 200, description: 'Lista de membros da célula' })
    public async getMembers(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        const permission = req.permission;
        const celulaId = Number(id);
        
        if (!permission?.isAdmin && !permission?.celulaIds.includes(celulaId)) {
            throw new HttpException('Você não tem acesso a esta célula', HttpStatus.FORBIDDEN);
        }

        return this.service.findMembersByCelulaId(celulaId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Put(':id')
    @ApiOperation({ summary: 'Atualizar célula' })
    @ApiBody({ type: CelulaUpdateInput })
    @ApiResponse({ status: 200, description: 'Célula atualizada' })
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CelulaUpdateInput) {
        const permission = req.permission;
        const celulaId = Number(id);
        
        if (!permission?.isAdmin && !permission?.celulaIds.includes(celulaId)) {
            throw new HttpException('Você não tem permissão para atualizar esta célula', HttpStatus.FORBIDDEN);
        }

        return this.service.update(celulaId, body as any);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Excluir célula' })
    @ApiResponse({ status: 200, description: 'Célula excluída' })
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        const permission = req.permission;
        const celulaId = Number(id);
        
        // Apenas admin ou liderança superior podem deletar
        if (permission && !permission.isAdmin) {
            const celula = await this.prisma.celula.findUnique({
                where: { id: celulaId },
                include: { discipulado: { include: { rede: true } } }
            });
            
            if (!celula) {
                throw new HttpException('Célula não encontrada', HttpStatus.NOT_FOUND);
            }
            
            // Verificar se é discipulador ou pastor
            const canDelete = (celula.discipuladoId && permission.discipuladoIds.includes(celula.discipuladoId)) ||
                            (celula.discipulado.redeId && permission.redeIds.includes(celula.discipulado.redeId));
            
            if (!canDelete) {
                throw new HttpException('Apenas discipuladores, pastores ou admins podem excluir células', HttpStatus.FORBIDDEN);
            }
        }
        
        await this.service.delete(celulaId);
        return { success: true };
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Post(':id/multiply')
    @ApiOperation({ summary: 'Multiplicar (dividir) uma célula: cria nova célula e move membros selecionados' })
    @ApiBody({ type: CelulaMultiplyInput })
    @ApiResponse({ status: 201, description: 'Célula multiplicada e membros movidos' })
    public async multiply(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CelulaMultiplyInput) {
        const permission = req.permission;
        const celulaId = Number(id);
        
        if (!permission) throw new HttpException('Sem permissão', HttpStatus.UNAUTHORIZED);
        
        // Buscar célula para verificar hierarquia
        const celula = await this.prisma.celula.findUnique({
            where: { id: celulaId },
            include: { discipulado: { include: { rede: true } } }
        });
        
        if (!celula) {
            throw new HttpException('Célula não encontrada', 404);
        }
        
        // Verificar se tem permissão para multiplicar
        // Pode multiplicar: admin, líder, vice-líder, discipulador ou pastor
        if (!permission.isAdmin) {
            const isLeader = celula.leaderMemberId === permission.id;
            const isViceLeader = celula.viceLeaderMemberId === permission.id;
            const isDiscipulador = celula.discipuladoId && permission.discipuladoIds.includes(celula.discipuladoId);
            const isPastor = celula.discipulado?.redeId && permission.redeIds.includes(celula.discipulado.redeId);
            
            if (!isLeader && !isViceLeader && !isDiscipulador && !isPastor) {
                throw new HttpException(
                    'Apenas a liderança da célula (líder ou vice), discipulador, pastor ou admins podem multiplicar esta célula',
                    HttpStatus.FORBIDDEN
                );
            }
        }

        return this.service.multiply(celulaId, body.memberIds, body.newCelulaName, body.newLeaderMemberId, body.oldLeaderMemberId);
    }

}
