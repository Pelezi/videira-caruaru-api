import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RoleService {
    constructor(private readonly prisma: PrismaService) {}

    public async findAll(matrixId: number) {
        // MANDATORY: Filter by matrixId to prevent cross-matrix access
        return this.prisma.role.findMany({ 
            where: { matrixId }, 
            orderBy: { name: 'asc' } 
        });
    }

    public async findById(id: number) {
        return this.prisma.role.findUnique({ where: { id } });
    }

    public async create(name: string, matrixId: number, isAdmin: boolean = false) {
        return this.prisma.role.create({ data: { name, isAdmin, matrix: { connect: { id: matrixId } } } });
    }

    public async update(id: number, name: string, isAdmin?: boolean) {
        const data: Prisma.RoleUpdateInput = { 
            name,
            ...(typeof isAdmin !== 'undefined' && { isAdmin })
        };
        return this.prisma.role.update({ where: { id }, data });
    }

    public async delete(id: number) {
        return this.prisma.role.delete({ where: { id } });
    }
}
