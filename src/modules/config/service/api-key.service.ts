import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/provider/prisma.provider';
import * as crypto from 'crypto';

export namespace ApiKeyData {
    export interface CreateInput {
        name: string;
        createdById: number;
    }

    export interface CreateOutput {
        id: number;
        name: string;
        key: string;
        isActive: boolean;
        createdAt: Date;
        lastUsedAt: Date | null;
    }

    export interface ListOutput {
        id: number;
        name: string;
        keyPreview: string; // Only show first/last chars
        isActive: boolean;
        createdAt: Date;
        lastUsedAt: Date | null;
        createdBy: {
            id: number;
            name: string;
        };
    }
}

@Injectable()
export class ApiKeyService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    /**
     * Generate a secure random API key
     */
    private generateApiKey(): string {
        return `vd_${crypto.randomBytes(32).toString('hex')}`;
    }

    /**
     * Create a new API key
     * Only returns the full key once - on creation
     */
    public async create(data: ApiKeyData.CreateInput, matrixId: number): Promise<ApiKeyData.CreateOutput> {
        const key = this.generateApiKey();

        const apiKey = await this.prisma.apiKey.create({
            data: {
                name: data.name,
                key,
                createdById: data.createdById,
                matrixId,
            }
        });

        return {
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key, // Only returned on creation
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
            lastUsedAt: apiKey.lastUsedAt,
        };
    }

    /**
     * List all API keys (without showing full keys)
     */
    public async list(): Promise<ApiKeyData.ListOutput[]> {
        const apiKeys = await this.prisma.apiKey.findMany({
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return apiKeys.map((apiKey: any) => ({
            id: apiKey.id,
            name: apiKey.name,
            keyPreview: `${apiKey.key.substring(0, 10)}...${apiKey.key.substring(apiKey.key.length - 4)}`,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
            lastUsedAt: apiKey.lastUsedAt,
            createdBy: apiKey.createdBy
        }));
    }

    /**
     * Toggle API key active status
     */
    public async toggleActive(id: number): Promise<void> {
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id }
        });

        if (!apiKey) {
            throw new HttpException('API key não encontrada', HttpStatus.NOT_FOUND);
        }

        await this.prisma.apiKey.update({
            where: { id },
            data: { isActive: !apiKey.isActive }
        });
    }

    /**
     * Delete an API key
     */
    public async delete(id: number): Promise<void> {
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id }
        });

        if (!apiKey) {
            throw new HttpException('API key não encontrada', HttpStatus.NOT_FOUND);
        }

        await this.prisma.apiKey.delete({
            where: { id }
        });
    }
}
