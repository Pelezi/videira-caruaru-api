import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { MemberService } from '../service/member.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard, hasCelulaAccessDb } from '../../common/security/permission.guard';
import { PrismaService } from '../../common';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import { MemberInput } from '../model/member.input';

@Controller()
@ApiTags('membros')
export class MemberController {
    constructor(private readonly service: MemberService, private readonly prisma: PrismaService) {}

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get('celulas/:celulaId/members')
    public async list(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string) {
        const permission = (req as any).permission;
        const celulaId = Number(celulaIdParam);
        const ok = await hasCelulaAccessDb(this.prisma, permission, celulaId);
        if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.findByCelula(celulaId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Post('celulas/:celulaId/members')
    @ApiOperation({ summary: 'Criar membro na célula' })
    @ApiBody({ type: MemberInput })
    @ApiResponse({ status: 201, description: 'Membro criado' })
    public async create(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string, @Body() body: MemberInput) {
        const permission = (req as any).permission;
        const celulaId = Number(celulaIdParam);
        const ok = await hasCelulaAccessDb(this.prisma, permission, celulaId);
        if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.create(celulaId, body.name);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Delete('members/:memberId')
    @ApiOperation({ summary: 'Inativar/excluir membro' })
    @ApiResponse({ status: 200, description: 'Membro inativado' })
    public async remove(@Req() req: AuthenticatedRequest, @Param('memberId') memberIdParam: string) {
        const permission = (req as any).permission;
        const memberId = Number(memberIdParam);
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member) throw new ForbiddenException('Member not found');
        const ok = await hasCelulaAccessDb(this.prisma, permission, member.celulaId);
        if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.delete(memberId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Put('members/:memberId')
    @ApiOperation({ summary: 'Atualizar membro' })
    @ApiResponse({ status: 200, description: 'Membro atualizado' })
    public async update(@Req() req: AuthenticatedRequest, @Param('memberId') memberIdParam: string, @Body() body: MemberInput) {
        const permission = (req as any).permission;
        const memberId = Number(memberIdParam);
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member) throw new ForbiddenException('Member not found');
        const ok = await hasCelulaAccessDb(this.prisma, permission, member.celulaId);
        if (!ok) throw new ForbiddenException('No access to this celula');

        return this.service.update(memberId, body as any);
    }

}
