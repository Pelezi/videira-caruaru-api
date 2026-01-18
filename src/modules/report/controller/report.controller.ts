import { Controller, Post, Body, UseGuards, Req, Param, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ReportService } from '../service/report.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PermissionService } from '../../common/security/permission.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import { ReportCreateInput } from '../model/report.input';

@Controller('celulas/:celulaId/reports')
@ApiTags('reports')
export class ReportController {
    constructor(
        private readonly service: ReportService,
        private readonly permissionService: PermissionService
    ) {}

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Post()
    @ApiOperation({ summary: 'Criar relatório para a célula' })
    @ApiBody({ type: ReportCreateInput })
    @ApiResponse({ status: 201, description: 'Relatório criado' })
    public async create(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string, @Body() body: ReportCreateInput) {
        const permission = req.permission;
        const celulaId = Number(celulaIdParam);
        
        if (!this.permissionService.hasCelulaAccess(permission, celulaId)) {
            throw new ForbiddenException('No access to this celula');
        }

        return this.service.create(celulaId, body.memberIds || [], body.date);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get()
    public async list(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string) {
        const permission = req.permission;
        const celulaId = Number(celulaIdParam);
        
        if (!this.permissionService.hasCelulaAccess(permission, celulaId)) {
            throw new ForbiddenException('No access to this celula');
        }

        return this.service.findByCelula(celulaId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get('presences')
    @ApiOperation({ summary: 'Relatório de presenças da célula' })
    public async presences(@Req() req: AuthenticatedRequest, @Param('celulaId') celulaIdParam: string) {
        const permission = req.permission;
        const celulaId = Number(celulaIdParam);
        
        if (!this.permissionService.hasCelulaAccess(permission, celulaId)) {
            throw new ForbiddenException('No access to this celula');
        }

        return this.service.presences(celulaId);
    }

    @UseGuards(RestrictedGuard, PermissionGuard)
    @Get('by-month/:year/:month')
    @ApiOperation({ summary: 'Relatórios por mês com presentes e ausentes' })
    public async reportsByMonth(
        @Req() req: AuthenticatedRequest, 
        @Param('celulaId') celulaIdParam: string,
        @Param('year') yearParam: string,
        @Param('month') monthParam: string
    ) {
        const permission = req.permission;
        const celulaId = Number(celulaIdParam);
        const year = Number(yearParam);
        const month = Number(monthParam);
        
        if (!this.permissionService.hasCelulaAccess(permission, celulaId)) {
            throw new ForbiddenException('No access to this celula');
        }

        return this.service.reportsByMonth(celulaId, year, month);
    }

}
