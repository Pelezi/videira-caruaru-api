import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/provider/prisma.provider';
import { SecurityConfigService } from '../config/service/security-config.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface AccessTokenPayload {
    userId: number;
    email?: string;
    matrixId: number;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly securityConfig: SecurityConfigService,
    ) {}

    /**
     * Generates an access token (JWT) for a user
     */
    public generateAccessToken(userId: number, matrixId: number, email?: string): string {
        const payload: AccessTokenPayload = {
            userId,
            email,
            matrixId
        };

        return jwt.sign(
            payload,
            this.securityConfig.jwtSecret,
            {
                expiresIn: this.securityConfig.jwtExpiresIn,
                issuer: this.securityConfig.jwtIssuer
            } as jwt.SignOptions
        );
    }

    /**
     * Generates a refresh token and stores it in the database
     */
    public async generateRefreshToken(userId: number): Promise<string> {
        // Generate a secure random token
        const token = crypto.randomBytes(64).toString('hex');
        
        // Calculate expiration (default 7 days)
        const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const expiresAt = this.calculateExpiration(expiresIn);

        // Store in database
        await this.prisma.refreshToken.create({
            data: {
                token,
                memberId: userId,
                expiresAt,
            }
        });

        return token;
    }

    /**
     * Validates a refresh token and returns the user ID
     */
    public async validateRefreshToken(token: string): Promise<number> {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { token }
        });

        if (!refreshToken) {
            throw new HttpException('Token de atualização inválido', HttpStatus.UNAUTHORIZED);
        }

        if (refreshToken.isRevoked) {
            throw new HttpException('Token de atualização revogado', HttpStatus.UNAUTHORIZED);
        }

        if (new Date() > refreshToken.expiresAt) {
            throw new HttpException('Token de atualização expirado', HttpStatus.UNAUTHORIZED);
        }

        return refreshToken.memberId;
    }

    /**
     * Revokes a refresh token
     */
    public async revokeRefreshToken(token: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { token },
            data: { isRevoked: true }
        });
    }

    /**
     * Revokes all refresh tokens for a user (useful for logout all sessions)
     */
    public async revokeAllUserTokens(userId: number): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { 
                memberId: userId,
                isRevoked: false
            },
            data: { isRevoked: true }
        });
    }

    /**
     * Cleans up expired tokens from the database
     */
    public async cleanupExpiredTokens(): Promise<number> {
        const result = await this.prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    }

    /**
     * Calculate expiration date from a duration string (e.g., '7d', '24h')
     */
    private calculateExpiration(duration: string): Date {
        const now = new Date();
        const match = duration.match(/^(\d+)([dhms])$/);
        
        if (!match) {
            // Default to 7 days if invalid format
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'd': // days
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            case 'h': // hours
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'm': // minutes
                return new Date(now.getTime() + value * 60 * 1000);
            case 's': // seconds
                return new Date(now.getTime() + value * 1000);
            default:
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
    }
}
