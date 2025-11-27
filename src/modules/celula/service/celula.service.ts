import { Injectable, BadRequestException, NotFoundException, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from '../../common';
import { CelulaCreateInput } from '../model/celula.input';

@Injectable()
export class CelulaService {
    constructor(private readonly prisma: PrismaService) { }

    public async findAll() {
        return this.prisma.celula.findMany({ orderBy: { name: 'asc' }, include: { leader: true, viceLeader: true } });
    }

    public async create(body: CelulaCreateInput) {
        const data: any = {
            name: body.name,
        };

        // leader is required by schema; use nested connect to satisfy Prisma relation input
        if (!body.leaderUserId) throw new BadRequestException('leaderUserId is required');
        data.leader = { connect: { id: body.leaderUserId } };

        if (!body.discipuladoId) throw new HttpException('discipulado é obrigatório', HttpStatus.BAD_REQUEST);
        data.discipulado = { connect: { id: body.discipuladoId } };

        if (body.viceLeaderUserId) {
            data.viceLeader = { connect: { id: body.viceLeaderUserId } };
        }

        return this.prisma.celula.create({ data: data, include: { leader: true, viceLeader: true, discipulado: true } });
    }

    public async findById(id: number) {
        return this.prisma.celula.findUnique({ where: { id }, include: { leader: true, viceLeader: true, discipulado: true } });
    }

    public async update(id: number, data: { name?: string; leaderUserId?: number }) {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.leaderUserId !== undefined) updateData.leader = { connect: { id: data.leaderUserId } };
        return this.prisma.celula.update({ where: { id }, data: updateData as any, include: { leader: true, viceLeader: true } });
    }

    /**
     * Multiply (split) a celula: create a new celula and move specified members from the original celula
     */
    public async multiply(
        originalCelulaId: number,
        memberIds: number[],
        newCelulaName: string,
        newLeaderUserId: number,
        oldLeaderUserId: number,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const original = await tx.celula.findUnique({ where: { id: originalCelulaId } });
            if (!original) {
                throw new NotFoundException('Original celula not found');
            }

            if (oldLeaderUserId && original.leaderUserId !== oldLeaderUserId) {
                throw new BadRequestException('Old leader does not match');
            }

            // create new celula
            const newCelula = await tx.celula.create({
                data: ({
                    name: newCelulaName,
                    discipuladoId: original.discipuladoId,
                    leader: { connect: { id: newLeaderUserId } }
                } as any),
                include: { leader: true }
            });

            // ensure members belong to the original celula
            const validMembers = await tx.member.findMany({ where: { id: { in: memberIds }, celulaId: originalCelulaId } });
            const validIds = validMembers.map(m => m.id);

            if (validIds.length === 0) {
                throw new BadRequestException('No provided members belong to the original celula');
            }

            await tx.member.updateMany({ where: { id: { in: validIds } }, data: { celulaId: newCelula.id } });

            return {
                newCelula,
                movedCount: validIds.length,
                movedMemberIds: validIds
            };
        });
    }

    public async delete(id: number): Promise<void> {
        // Do not allow deletion if there are inactive members
        const inactiveCount = await this.prisma.member.count({ where: { celulaId: id, status: 'INACTIVE' } });
        if (inactiveCount > 0) {
            throw new BadRequestException('Cannot delete celula with inactive members');
        }

        // Do not allow deletion if there are any members at all
        const memberCount = await this.prisma.member.count({ where: { celulaId: id } });
        if (memberCount > 0) {
            throw new BadRequestException('Cannot delete celula with associated members');
        }

        // safe to delete
        await this.prisma.report.deleteMany({ where: { celulaId: id } });
        await this.prisma.celula.delete({ where: { id } });
    }

}
