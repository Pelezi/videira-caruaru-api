import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';

@Injectable()
export class WinnerPathService {
    constructor(private readonly prisma: PrismaService) {}

    public async findAll(matrixId: number) {
        // MANDATORY: Filter by matrixId to prevent cross-matrix access
        return this.prisma.winnerPath.findMany({ 
            where: { matrixId }, 
            orderBy: { priority: 'asc' } 
        });
    }

    public async findById(id: number) {
        return this.prisma.winnerPath.findUnique({ where: { id } });
    }

    public async create(name: string, matrixId: number) {
        const maxPriority = await this.prisma.winnerPath.findFirst({ orderBy: { priority: 'desc' } });
        const priority = maxPriority ? maxPriority.priority + 1 : 0;
        return this.prisma.winnerPath.create({ data: { name, priority, matrix: { connect: { id: matrixId } } } });
    }

    public async update(id: number, name: string) {
        return this.prisma.winnerPath.update({ where: { id }, data: { name } });
    }

    public async updatePriority(id: number, priority: number) {
        return this.prisma.winnerPath.update({ where: { id }, data: { priority } });
    }

    public async delete(id: number) {
        return this.prisma.winnerPath.delete({ where: { id } });
    }
}
