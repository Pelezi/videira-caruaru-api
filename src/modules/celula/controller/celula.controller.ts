import { Controller, Get, Post, Body, Param, UseGuards, Req, Put, HttpException, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CelulaService } from '../service/celula.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PrismaService } from '../../common';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import { CelulaCreateInput, CelulaUpdateInput, CelulaMultiplyInput } from '../model/celula.input';

@Controller('celulas')
@ApiTags('celulas')
export class CelulaController {
    constructor(private readonly service: CelulaService, private readonly prisma: PrismaService) {}

    @UseGuards(RestrictedGuard)
    @Get()
    public async find(@Req() req: AuthenticatedRequest) {
        const user = req.user;
        if (!user) throw new HttpException('No user in request', 401);
        if (user.admin) {
            return this.service.findAll();
        }

        // find celulas linked to user and include leader relation
        // celulas onde é líder ou líder em treinamento
        let celulaIds: number[] = [];
        const viceLeadCelulas = await this.prisma.celula.findMany({ where: { viceLeaderUserId: user.userId }, select: { id: true } });
        celulaIds.push(...viceLeadCelulas.map(c => c.id));
        const ledCelulas = await this.prisma.celula.findMany({ where: { leaderUserId: user.userId }, select: { id: true } });
        celulaIds.push(...ledCelulas.map(c => c.id));
        //Células onde é discipulador
        const celulasDiscipulado = await this.prisma.discipulado.findMany({
            where: { discipuladorUserId: user.userId },
            include: { celulas: { select: { id: true } } }
        });
        celulaIds.push(...celulasDiscipulado.flatMap(d => d.celulas.map(c => c.id)));
        // Células onde é pastor de rede
        const redesPastoradas = await this.prisma.rede.findMany({
            where: { pastorUserId: user.userId },
            include: { discipulados: { include: { celulas: { select: { id: true } } } } }
        });
        celulaIds.push(...redesPastoradas.flatMap(r => r.discipulados.flatMap(d => d.celulas.map(c => c.id))));

        if (celulaIds.length === 0) return [];
        return this.prisma.celula.findMany({ where: { id: { in: celulaIds } }, include: { leader: true }, orderBy: { name: 'asc' } });
    }

    @UseGuards(RestrictedGuard)
    @Post()
    @ApiOperation({ summary: 'Criar uma nova célula' })
    @ApiBody({ type: CelulaCreateInput })
    @ApiResponse({ status: 201, description: 'Célula criada' })
    public async create(@Req() req: AuthenticatedRequest, @Body() body: CelulaCreateInput) {
        // const permission = (req as any).permission;
        // Only users with management rights at appropriate scope can create celulas.
        // todo

        return this.service.create(body);
    }

    @UseGuards(RestrictedGuard)
    @Get(':id')
    public async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        // const permission = (req as any).permission;
        const celulaId = Number(id);
        // const ok = await hasCelulaAccessDb(this.prisma, permission, celulaId);
        // if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.findById(celulaId);
    }

    @UseGuards(RestrictedGuard)
    @Put(':id')
    @ApiOperation({ summary: 'Atualizar célula' })
    @ApiBody({ type: CelulaUpdateInput })
    @ApiResponse({ status: 200, description: 'Célula atualizada' })
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CelulaUpdateInput) {
        // const permission = (req as any).permission;
        // requireCanManageCelulas(permission);
        const celulaId = Number(id);
        // const ok = await hasCelulaAccessDb(this.prisma, permission, celulaId);
        // if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.update(celulaId, body as any);
    }

    @UseGuards(RestrictedGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Excluir célula' })
    @ApiResponse({ status: 200, description: 'Célula excluída' })
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        const celulaId = Number(id);
        await this.service.delete(celulaId);
        return { success: true };
    }

    @UseGuards(RestrictedGuard)
    @Post(':id/multiply')
    @ApiOperation({ summary: 'Multiplicar (dividir) uma célula: cria nova célula e move membros selecionados' })
    @ApiBody({ type: CelulaMultiplyInput })
    @ApiResponse({ status: 201, description: 'Célula multiplicada e membros movidos' })
    public async multiply(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CelulaMultiplyInput) {
        // const permission = (req as any).permission;
        // requireCanManageCelulas(permission);
        const celulaId = Number(id);
        // const ok = await hasCelulaAccessDb(this.prisma, permission, celulaId);
        // if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.multiply(celulaId, body.memberIds, body.newCelulaName, body.newLeaderUserId, body.oldLeaderUserId);
    }

}
