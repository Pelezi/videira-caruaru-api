import { Controller, Get, Post, Body, UseGuards, Req, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { RedeService } from '../service/rede.service';
import { RedeCreateInput } from '../model/rede.input';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';

@UseGuards(RestrictedGuard)
@Controller('redes')
@ApiTags('redes')
export class RedeController {
    constructor(private readonly service: RedeService) {}

    @Get()
    public async list(@Req() req: AuthenticatedRequest) {
        if (!req.member?.matrixId) {
            throw new Error('Matrix ID não encontrado');
        }
        return this.service.findAll(req.member.matrixId);
    }

    @Post()
    @ApiOperation({ summary: 'Criar rede' })
    @ApiBody({ type: RedeCreateInput })
    @ApiResponse({ status: 201, description: 'Rede criada' })
    public async create(@Req() req: AuthenticatedRequest, @Body() body: RedeCreateInput) {
        return this.service.create({ ...body, matrixId: req.member!.matrixId });
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar rede' })
    public async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: RedeCreateInput) {
        return this.service.update(Number(id), body as any, req.member!.matrixId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Excluir rede' })
    public async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.service.delete(Number(id));
    }
}
