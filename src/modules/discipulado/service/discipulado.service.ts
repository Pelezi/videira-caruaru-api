import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common';
import { DiscipuladoCreateInput } from '../model/discipulado.input';
import { canBeDiscipulador, getMinistryTypeLabel } from '../../common/helpers/ministry-permissions.helper';
import { createMatrixValidator } from '../../common/helpers/matrix-validation.helper';

@Injectable()
export class DiscipuladoService {
    constructor(private readonly prisma: PrismaService) {}

    public async findAll(matrixId: number) {
        // MANDATORY: Filter by matrixId to prevent cross-matrix access
        return this.prisma.discipulado.findMany({
            where: { matrixId },
            include: { 
                rede: true, 
                discipulador: true 
            },
            orderBy: { 
                discipulador: { name: 'asc' }
            } 
        });
    }

    public async create(data: DiscipuladoCreateInput) {
        const validator = createMatrixValidator(this.prisma);
        
        // Validate rede belongs to same matrix
        await validator.validateRedeBelongsToMatrix(data.redeId, data.matrixId!);
        
        if (data.discipuladorMemberId) {
            // Validate discipulador belongs to same matrix
            await validator.validateMemberBelongsToMatrix(data.discipuladorMemberId, data.matrixId!);
            
            const discipulador = await this.prisma.member.findUnique({
                where: { id: data.discipuladorMemberId },
                include: { ministryPosition: true }
            });
            if (!discipulador) {
                throw new BadRequestException('Discipulador não encontrado');
            }
            if (!canBeDiscipulador(discipulador.ministryPosition?.type)) {
                throw new BadRequestException(
                    `Membro não pode ser discipulador. Nível ministerial atual: ${getMinistryTypeLabel(discipulador.ministryPosition?.type)}. ` +
                    `É necessário ser pelo menos Discipulador.`
                );
            }
        }
        return this.prisma.discipulado.create({ 
            data: { 
                redeId: data.redeId, 
                discipuladorMemberId: data.discipuladorMemberId,
                matrixId: data.matrixId!
            } 
        });
    }

    public async update(id: number, data: Partial<DiscipuladoCreateInput>, matrixId: number) {
        const validator = createMatrixValidator(this.prisma);
        
        // Validate the discipulado being updated belongs to the matrix
        await validator.validateDiscipuladoBelongsToMatrix(id, matrixId);
        
        // Validate rede belongs to same matrix if being updated
        if (data.redeId !== undefined) {
            await validator.validateRedeBelongsToMatrix(data.redeId, matrixId);
        }
        
        if (data.discipuladorMemberId !== undefined && data.discipuladorMemberId !== null) {
            // Validate discipulador belongs to same matrix
            await validator.validateMemberBelongsToMatrix(data.discipuladorMemberId, matrixId);
            
            const discipulador = await this.prisma.member.findUnique({
                where: { id: data.discipuladorMemberId },
                include: { ministryPosition: true }
            });
            if (!discipulador) {
                throw new BadRequestException('Discipulador não encontrado');
            }
            if (!canBeDiscipulador(discipulador.ministryPosition.type)) {
                throw new BadRequestException(
                    `Membro não pode ser discipulador. Nível ministerial atual: ${getMinistryTypeLabel(discipulador.ministryPosition?.type)}. ` +
                    `É necessário ser pelo menos Discipulador.`
                );
            }
        }
        return this.prisma.discipulado.update({ where: { id }, data: { redeId: data.redeId, discipuladorMemberId: data.discipuladorMemberId } });
    }

    public async delete(id: number) {
        const count = await this.prisma.celula.count({ where: { discipuladoId: id } });
        if (count > 0) {
            throw new BadRequestException('Discipulado possui células vinculadas');
        }

        return this.prisma.discipulado.delete({ where: { id } });
    }

}
