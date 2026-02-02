import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleService } from '../service/role.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PermissionService } from '../../common/security/permission.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';

@ApiTags('Config - Roles')
@Controller('roles')
@UseGuards(RestrictedGuard, PermissionGuard)
export class RoleController {
    constructor(
        private readonly roleService: RoleService,
        private readonly permissionService: PermissionService
    ) {}

    @Get()
    public async findAll(@Req() req: AuthenticatedRequest) {
        if (!req.member?.matrixId) {
            throw new HttpException('Matrix ID não encontrado', HttpStatus.UNAUTHORIZED);
        }
        return this.roleService.findAll(req.member.matrixId);
    }

    @Get(':id')
    public async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.roleService.findById(parseInt(id, 10));
    }

    @Post()
    public async create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; isAdmin?: boolean }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem criar funções', HttpStatus.UNAUTHORIZED);
        }
        return this.roleService.create(body.name, req.member!.matrixId, body.isAdmin);
    }

    @Put(':id')
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { name: string; isAdmin?: boolean }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem atualizar funções', HttpStatus.UNAUTHORIZED);
        }
        return this.roleService.update(parseInt(id, 10), body.name, body.isAdmin);
    }

    @Delete(':id')
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem deletar funções', HttpStatus.UNAUTHORIZED);
        }
        return this.roleService.delete(parseInt(id, 10));
    }
}
