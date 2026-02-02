import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../provider/prisma.provider';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<FastifyRequest>();
        
        // Check for API key in header
        const apiKey = request.headers['x-api-key'] as string;
        
        if (!apiKey) {
            return false;
        }

        // Verify API key exists and is active
        const keyRecord = await this.prisma.apiKey.findUnique({
            where: { key: apiKey }
        });

        if (!keyRecord || !keyRecord.isActive) {
            return false;
        }

        // Update last used timestamp (fire and forget)
        this.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() }
        }).catch((err: unknown) => {
            console.error('Failed to update API key lastUsedAt:', err);
        });

        return true;
    }
}
