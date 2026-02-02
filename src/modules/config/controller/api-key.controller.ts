import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { RestrictedGuard } from '../../common/security/restricted.guard';
import { PermissionGuard } from '../../common/security/permission.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.interface';
import { ApiKeyService } from '../service/api-key.service';
import { PrismaService } from '../../common/provider/prisma.provider';

class CreateApiKeyInput {
    name!: string;
}

@Controller('config/api-keys')
@ApiTags('config')
@UseGuards(RestrictedGuard, PermissionGuard)
@ApiBearerAuth()
export class ApiKeyController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    @ApiOperation({ 
        summary: 'Lista todas as API keys (apenas admins)',
        description: 'Retorna todas as API keys sem expor as chaves completas'
    })
    @ApiResponse({ status: 200, description: 'Lista de API keys' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Não autorizado - apenas owners' })
    public async list(@Request() req: AuthenticatedRequest) {
        // Check if user is owner
        const member = await this.prisma.member.findUnique({ where: { id: req.member?.id } });
        if (!member?.isOwner) {
            throw new HttpException('Apenas owners podem gerenciar API keys', HttpStatus.FORBIDDEN);
        }

        return await this.apiKeyService.list();
    }

    @Post()
    @ApiOperation({ 
        summary: 'Cria uma nova API key (apenas admins)',
        description: 'Cria uma nova API key. A chave completa é retornada apenas uma vez.'
    })
    @ApiBody({ type: CreateApiKeyInput })
    @ApiResponse({ 
        status: 201, 
        description: 'API key criada com sucesso. IMPORTANTE: A chave completa é mostrada apenas uma vez!'
    })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Não autorizado - apenas owners' })
    public async create(
        @Request() req: AuthenticatedRequest,
        @Body() body: CreateApiKeyInput
    ) {
        // Check if user is owner
        const member = await this.prisma.member.findUnique({ where: { id: req.member?.id } });
        if (!member?.isOwner) {
            throw new HttpException('Apenas owners podem gerenciar API keys', HttpStatus.FORBIDDEN);
        }

        if (!req.member?.id) {
            throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
        }

        return await this.apiKeyService.create({
            name: body.name,
            createdById: req.member.id
        }, req.member.matrixId);
    }

    @Patch(':id/toggle')
    @ApiOperation({ 
        summary: 'Ativa/desativa uma API key (apenas admins)',
        description: 'Alterna o status ativo/inativo de uma API key'
    })
    @ApiResponse({ status: 200, description: 'Status alterado com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Não autorizado - apenas owners' })
    @ApiResponse({ status: 404, description: 'API key não encontrada' })
    public async toggleActive(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string
    ) {
        // Check if user is owner
        const member = await this.prisma.member.findUnique({ where: { id: req.member?.id } });
        if (!member?.isOwner) {
            throw new HttpException('Apenas owners podem gerenciar API keys', HttpStatus.FORBIDDEN);
        }

        await this.apiKeyService.toggleActive(parseInt(id));
        return { message: 'Status alterado com sucesso' };
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Exclui uma API key (apenas admins)',
        description: 'Remove permanentemente uma API key'
    })
    @ApiResponse({ status: 200, description: 'API key excluída com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Não autorizado - apenas owners' })
    @ApiResponse({ status: 404, description: 'API key não encontrada' })
    public async delete(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string
    ) {
        // Check if user is owner
        const member = await this.prisma.member.findUnique({ where: { id: req.member?.id } });
        if (!member?.isOwner) {
            throw new HttpException('Apenas owners podem gerenciar API keys', HttpStatus.FORBIDDEN);
        }

        await this.apiKeyService.delete(parseInt(id));
        return { message: 'API key excluída com sucesso' };
    }
}
