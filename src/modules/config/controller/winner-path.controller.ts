import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WinnerPathService } from '../service/winner-path.service';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { PermissionService } from '../../common/security/permission.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';

@ApiTags('Config - Winner Paths')
@Controller('winner-paths')
@UseGuards(RestrictedGuard, PermissionGuard)
export class WinnerPathController {
    constructor(
        private readonly winnerPathService: WinnerPathService,
        private readonly permissionService: PermissionService
    ) {}

    @Get()
    public async findAll(@Req() req: AuthenticatedRequest) {
        if (!req.member?.matrixId) {
            throw new HttpException('Matrix ID não encontrado', HttpStatus.UNAUTHORIZED);
        }
        return this.winnerPathService.findAll(req.member.matrixId);
    }

    @Get(':id')
    public async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.winnerPathService.findById(parseInt(id, 10));
    }

    @Post()
    public async create(@Req() req: AuthenticatedRequest, @Body() body: { name: string }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem criar o caminho do vencedor', HttpStatus.UNAUTHORIZED);
        }
        return this.winnerPathService.create(body.name, req.member!.matrixId);
    }

    @Put(':id')
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { name: string }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem atualizar o caminho do vencedor', HttpStatus.UNAUTHORIZED);
        }
        return this.winnerPathService.update(parseInt(id, 10), body.name);
    }

    @Put(':id/priority')
    public async updatePriority(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { priority: number }) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem atualizar prioridade de o caminho do vencedor', HttpStatus.UNAUTHORIZED);
        }
        return this.winnerPathService.updatePriority(parseInt(id, 10), body.priority);
    }

    @Delete(':id')
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        try {
            this.permissionService.requireAdmin(req.permission);
        } catch (error: unknown) {
            throw new HttpException('Apenas administradores podem deletar o caminho do vencedor', HttpStatus.UNAUTHORIZED);
        }
        return this.winnerPathService.delete(parseInt(id, 10));
    }
}
