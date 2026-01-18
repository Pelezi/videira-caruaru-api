import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from '../member/service/member.service';
import { LoginInput } from '../member/model';
import { RestrictedGuard } from '../common/security/restricted.guard';
import { PermissionService } from '../common/security/permission.service';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
    constructor(
        private readonly memberService: MemberService,
        private readonly permissionService: PermissionService,
    ) {}

    @Post('login')
    @ApiOperation({ summary: 'Login de usuário' })
    @ApiBody({ type: LoginInput })
    @ApiResponse({ status: 200, description: 'Retorna token JWT e dados do usuário' })
    public async login(@Body() body: LoginInput) {
        const res = await this.memberService.login(body);
        return res;
    }

    @Get('refresh')
    @UseGuards(RestrictedGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Atualiza permissões do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Retorna as permissões atualizadas do usuário' })
    public async refreshPermissions(@Request() req: AuthenticatedRequest) {
        if (!req.member) {
            throw new Error('Usuário não autenticado');
        }
        const memberId = req.member.id;
        const member = await this.memberService.findById(memberId);
        const permission = await this.permissionService.loadSimplifiedPermissionForMember(memberId);
        
        return {
            user: member,
            permission
        };
    }
}
