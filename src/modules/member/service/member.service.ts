import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';

@Injectable()
export class MemberService {
    constructor(private readonly prisma: PrismaService) {}

    public async findByCelula(celulaId: number) {
        return this.prisma.member.findMany({ where: { celulaId }, orderBy: { name: 'asc' } });
    }

    public async create(celulaId: number, name: string) {
        return this.prisma.member.create({ data: { name, celulaId, status: 'MEMBER' } });
    }

    public async delete(memberId: number) {
        return this.prisma.member.delete({ where: { id: memberId } });
    }

    public async update(memberId: number, data: { name?: string; status?: string; maritalStatus?: string }) {
        const payload: any = {};
        if (typeof data.name !== 'undefined') payload.name = data.name;
        if (typeof data.status !== 'undefined') payload.status = data.status;
        if (typeof data.maritalStatus !== 'undefined') payload.maritalStatus = data.maritalStatus;
        return this.prisma.member.update({ where: { id: memberId }, data: payload });
    }

}
