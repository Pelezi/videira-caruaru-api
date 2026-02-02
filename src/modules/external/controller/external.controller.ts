import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/security/api-key.guard';
import { ExternalService } from '../service/external.service';

@Controller('external')
@ApiTags('external')
@UseGuards(ApiKeyGuard)
@ApiSecurity('X-API-KEY')
export class ExternalController {
    constructor(
        private readonly externalService: ExternalService,
    ) { }

    @Get('check-phone')
    @ApiOperation({
        summary: 'Verifica se existe um usuário com o telefone informado',
        description: 'Endpoint para acesso externo via API key. Retorna true se existe um membro com o número de telefone informado.'
    })
    @ApiQuery({
        name: 'phone',
        required: true,
        type: String,
        description: 'Número de telefone a ser verificado'
    })
    @ApiResponse({
        status: 200,
        description: 'Retorna boolean indicando se o telefone existe',
        schema: {
            type: 'object',
            properties: {
                exists: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'API key inválida ou não fornecida'
    })
    public async checkPhone(
        @Query('phone') phone: string,
        @Headers('X-API-KEY') apiKey: string
    ) {
        const exists = await this.externalService.checkPhoneExists(phone);
        return { exists };
    }
}
