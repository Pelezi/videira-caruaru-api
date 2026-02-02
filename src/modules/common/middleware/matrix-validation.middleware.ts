import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { SecurityConfigService } from '../../config/service/security-config.service';
import { MatrixService } from '../../matrix/service/matrix.service';

interface TokenPayload {
    userId: number;
    email?: string;
    matrixId?: number;
    purpose?: string;
}

@Injectable()
export class MatrixValidationMiddleware implements NestMiddleware {
    constructor(
        private readonly securityConfig: SecurityConfigService,
        private readonly matrixService: MatrixService,
    ) {}

    async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
        // Rotas públicas que não precisam de validação de matriz
        const publicRoutes = [
            '/auth/login',
            '/auth/select-matrix',
            '/auth/refresh-token',
            '/matrix/domain/',
            '/health',
            '/api-docs'
        ];

        // Verificar se é uma rota pública
        const isPublicRoute = publicRoutes.some(route => req.url?.startsWith(route));
        if (isPublicRoute) {
            return next();
        }

        // Pegar token do header
        const authHeader = req.headers['authorization'] as string;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Deixar o guard de autenticação lidar com isso
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, this.securityConfig.jwtSecret) as TokenPayload;

            // Se o token é para seleção de matriz, bloquear acesso
            if (decoded.purpose === 'matrix-selection') {
                throw new HttpException(
                    'Por favor, selecione uma matriz antes de continuar',
                    HttpStatus.FORBIDDEN
                );
            }

            // Se o token não tem matrixId, permitir (pode ser um token antigo)
            if (!decoded.matrixId) {
                return next();
            }

            // Pegar o origin/host da requisição
            const origin = req.headers['origin'];

            // Skip validation if no domain available (development/localhost)
            if (!origin) {
                return next();
            }

            // Buscar matriz pelo domínio (normalization happens inside findByDomain)
            const matrixByDomain = await this.matrixService.findByDomain(origin);

            if (!matrixByDomain) {
                return next();
            }

            // Verificar se o matrixId do token corresponde ao domínio
            if (matrixByDomain.id !== decoded.matrixId) {
                throw new HttpException(
                    'Você não tem permissão para acessar esta matriz/base. Por favor, faça login novamente.',
                    HttpStatus.FORBIDDEN
                );
            }

            // Adicionar matrixId ao request para uso posterior
            (req as any).matrixId = decoded.matrixId;

            next();
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            // Se o token for inválido, deixar o guard de autenticação lidar
            next();
        }
    }
}
