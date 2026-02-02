import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MinistryService } from '../service/ministry.service';
import { $Enums } from '../../../generated/prisma/client';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PermissionService } from '../../common/security/permission.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';

@ApiTags('Config - Ministries')
@Controller('ministries')
@UseGuards(RestrictedGuard, PermissionGuard)
export class MinistryController {
    constructor(
        private readonly ministryService: MinistryService,
        private readonly permissionService: PermissionService
    ) {}

    @Get()
    public async findAll(@Req() req: AuthenticatedRequest) {
        if (!req.member?.matrixId) {
            throw new HttpException('Matrix ID não encontrado', HttpStatus.UNAUTHORIZED);
        }
        return this.ministryService.findAll(req.member.matrixId);
    }

    @Get(':id')
    public async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.ministryService.findById(parseInt(id, 10));
    }

    @Post()
    public async create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; type?: $Enums.MinistryType }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem criar ministérios', HttpStatus.UNAUTHORIZED);
        }
        return this.ministryService.create(body.name, req.member!.matrixId, body.type);
    }

    @Put(':id')
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { name: string; type?: $Enums.MinistryType }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem atualizar ministérios', HttpStatus.UNAUTHORIZED);
        }
        return this.ministryService.update(parseInt(id, 10), body.name, body.type);
    }

    @Put(':id/priority')
    public async updatePriority(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { priority: number }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem atualizar prioridade de ministérios', HttpStatus.UNAUTHORIZED);
        }
        return this.ministryService.updatePriority(parseInt(id, 10), body.priority);
    }

    @Delete(':id')
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem deletar ministérios', HttpStatus.UNAUTHORIZED);
        }
        return this.ministryService.delete(parseInt(id, 10));
    }
}
