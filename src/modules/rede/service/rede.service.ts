import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common';
import { RedeCreateInput } from '../model/rede.input';
import { canBePastor, getMinistryTypeLabel } from '../../common/helpers/ministry-permissions.helper';
import { createMatrixValidator } from '../../common/helpers/matrix-validation.helper';

@Injectable()
export class RedeService {
    constructor(private readonly prisma: PrismaService) {}

    public async findAll(matrixId: number) {
        // MANDATORY: Filter by matrixId to prevent cross-matrix access
        return this.prisma.rede.findMany({
            where: { matrixId },
            include: {
                pastor: true
            },
            orderBy: { 
                name: 'asc' 
            } 
        });
    }

    public async create(data: RedeCreateInput) {
        const validator = createMatrixValidator(this.prisma);
        
        if (data.pastorMemberId) {
            // Validate pastor belongs to same matrix
            await validator.validateMemberBelongsToMatrix(data.pastorMemberId, data.matrixId!);
            
            const pastor = await this.prisma.member.findUnique({
                where: { id: data.pastorMemberId },
                include: { ministryPosition: true }
            });
            if (!pastor) {
                throw new BadRequestException('Pastor não encontrado');
            }
            if (!canBePastor(pastor.ministryPosition?.type)) {
                throw new BadRequestException(
                    `Membro não pode ser pastor de rede. Nível ministerial atual: ${getMinistryTypeLabel(pastor.ministryPosition?.type)}. ` +
                    `É necessário ser Pastor.`
                );
            }
        }
        return this.prisma.rede.create({ data: { name: data.name, pastorMemberId: data.pastorMemberId, matrixId: data.matrixId! } });
    }

    public async update(id: number, data: Partial<RedeCreateInput>, matrixId: number) {
        const validator = createMatrixValidator(this.prisma);
        
        // Validate the rede being updated belongs to the matrix
        await validator.validateRedeBelongsToMatrix(id, matrixId);
        
        if (data.pastorMemberId !== undefined && data.pastorMemberId !== null) {
            // Validate pastor belongs to same matrix
            await validator.validateMemberBelongsToMatrix(data.pastorMemberId, matrixId);
            
            const pastor = await this.prisma.member.findUnique({
                where: { id: data.pastorMemberId },
                include: { ministryPosition: true }
            });
            if (!pastor) {
                throw new BadRequestException('Pastor não encontrado');
            }
            if (!canBePastor(pastor.ministryPosition?.type)) {
                throw new BadRequestException(
                    `Membro não pode ser pastor de rede. Nível ministerial atual: ${getMinistryTypeLabel(pastor.ministryPosition?.type)}. ` +
                    `É necessário ser Pastor.`
                );
            }
        }
        return this.prisma.rede.update({ where: { id }, data: { name: data.name, pastorMemberId: data.pastorMemberId } });
    }

    public async delete(id: number) {
        const count = await this.prisma.discipulado.count({ where: { redeId: id } });
        if (count > 0) {
            throw new BadRequestException('Rede possui discipulados vinculados');
        }

        return this.prisma.rede.delete({ where: { id } });
    }

}
