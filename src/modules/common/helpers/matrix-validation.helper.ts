import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../provider/prisma.provider';

/**
 * Matrix Validation Helper
 * Provides reusable validation functions to ensure data isolation across matrices
 */
export class MatrixValidationHelper {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Validates that a celula belongs to the specified matrix
     * @throws HttpException if celula not found or belongs to different matrix
     */
    async validateCelulaBelongsToMatrix(celulaId: number, matrixId: number): Promise<void> {
        const celula = await this.prisma.celula.findUnique({
            where: { id: celulaId },
            select: { matrixId: true }
        });

        if (!celula) {
            throw new HttpException('Célula não encontrada', HttpStatus.NOT_FOUND);
        }

        if (celula.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a ministry belongs to the specified matrix
     * @throws HttpException if ministry not found or belongs to different matrix
     */
    async validateMinistryBelongsToMatrix(ministryId: number, matrixId: number): Promise<void> {
        const ministry = await this.prisma.ministry.findUnique({
            where: { id: ministryId },
            select: { matrixId: true }
        });

        if (!ministry) {
            throw new HttpException('Cargo ministerial não encontrado', HttpStatus.NOT_FOUND);
        }

        if (ministry.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a rede belongs to the specified matrix
     * @throws HttpException if rede not found or belongs to different matrix
     */
    async validateRedeBelongsToMatrix(redeId: number, matrixId: number): Promise<void> {
        const rede = await this.prisma.rede.findUnique({
            where: { id: redeId },
            select: { matrixId: true }
        });

        if (!rede) {
            throw new HttpException('Rede não encontrada', HttpStatus.NOT_FOUND);
        }

        if (rede.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a discipulado belongs to the specified matrix
     * @throws HttpException if discipulado not found or belongs to different matrix
     */
    async validateDiscipuladoBelongsToMatrix(discipuladoId: number, matrixId: number): Promise<void> {
        const discipulado = await this.prisma.discipulado.findUnique({
            where: { id: discipuladoId },
            select: { matrixId: true }
        });

        if (!discipulado) {
            throw new HttpException('Discipulado não encontrado', HttpStatus.NOT_FOUND);
        }

        if (discipulado.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a role belongs to the specified matrix
     * @throws HttpException if role not found or belongs to different matrix
     */
    async validateRoleBelongsToMatrix(roleId: number, matrixId: number): Promise<void> {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
            select: { matrixId: true }
        });

        if (!role) {
            throw new HttpException('Role não encontrado', HttpStatus.NOT_FOUND);
        }

        if (role.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a winner path belongs to the specified matrix
     * @throws HttpException if winner path not found or belongs to different matrix
     */
    async validateWinnerPathBelongsToMatrix(winnerPathId: number, matrixId: number): Promise<void> {
        const winnerPath = await this.prisma.winnerPath.findUnique({
            where: { id: winnerPathId },
            select: { matrixId: true }
        });

        if (!winnerPath) {
            throw new HttpException('Caminho do vencedor não encontrado', HttpStatus.NOT_FOUND);
        }

        if (winnerPath.matrixId !== matrixId) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Validates that a member belongs to the specified matrix
     * @throws HttpException if member not found or doesn't belong to matrix
     */
    async validateMemberBelongsToMatrix(memberId: number, matrixId: number): Promise<void> {
        const memberMatrix = await this.prisma.memberMatrix.findFirst({
            where: {
                memberId,
                matrixId
            }
        });

        if (!memberMatrix) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
    }
}

/**
 * Factory function to create a MatrixValidationHelper instance
 * Use this in services that need matrix validation
 */
export function createMatrixValidator(prisma: PrismaService): MatrixValidationHelper {
    return new MatrixValidationHelper(prisma);
}
