import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ReportService {
    constructor(private readonly prisma: PrismaService) {}

    public async create(celulaId: number, memberIds: number[], date?: string) {
        const brazilOffsetHours = 3;

        let startUtc: Date;
        let endUtc: Date;

        if (date) {
            // date expected in YYYY-MM-DD
            const parts = date.split('-').map(p => Number(p));
            const y = parts[0];
            const m = parts[1];
            const d = parts[2];
            const startBrazilUtcMillis = Date.UTC(y, m - 1, d, 0, 0, 0) + brazilOffsetHours * 60 * 60 * 1000;
            const endBrazilUtcMillis = Date.UTC(y, m - 1, d, 23, 59, 59, 999) + brazilOffsetHours * 60 * 60 * 1000;
            startUtc = new Date(startBrazilUtcMillis);
            endUtc = new Date(endBrazilUtcMillis);
        } else {
            const nowUtc = new Date();
            const nowBrazil = new Date(nowUtc.getTime() - brazilOffsetHours * 60 * 60 * 1000);
            const startBrazilLocal = new Date(nowBrazil);
            startBrazilLocal.setHours(0, 0, 0, 0);
            const endBrazilLocal = new Date(nowBrazil);
            endBrazilLocal.setHours(23, 59, 59, 999);
            startUtc = new Date(startBrazilLocal.getTime() + brazilOffsetHours * 60 * 60 * 1000);
            endUtc = new Date(endBrazilLocal.getTime() + brazilOffsetHours * 60 * 60 * 1000);
        }

        await this.prisma.report.deleteMany({ where: { celulaId, createdAt: { gte: startUtc, lte: endUtc } } });

        const createData: Partial<Prisma.ReportCreateInput> & { celula: { connect: { id: number } } } = { 
            celula: { connect: { id: celulaId } },
            ...(date && { createdAt: startUtc })
        };

        const report = await this.prisma.report.create({ data: createData });

        const attendances = memberIds.map(mid => ({ reportId: report.id, memberId: mid }));
        if (attendances.length > 0) {
            await this.prisma.reportAttendance.createMany({ data: attendances });
        }

        return this.findById(report.id);
    }

    public async findById(id: number) {
        return this.prisma.report.findUnique({ where: { id }, include: { attendances: { include: { member: true } } } });
    }

    public async findByCelula(celulaId: number) {
        return this.prisma.report.findMany({ where: { celulaId }, orderBy: { createdAt: 'desc' }, include: { attendances: { include: { member: true } } } });
    }

    public async presences(celulaId: number) {
        const reports = await this.prisma.report.findMany({
            where: { celulaId },
            orderBy: { createdAt: 'desc' },
            include: { attendances: { include: { member: true } } }
        });

        return reports.map(r => ({
            date: r.createdAt,
            members: (r.attendances || []).map(a => a.member)
        }));
    }

    public async reportsByMonth(celulaId: number, year: number, month: number) {
        const brazilOffsetHours = 3;
        
        // Calcular início e fim do mês em UTC
        const startBrazilUtcMillis = Date.UTC(year, month - 1, 1, 0, 0, 0) + brazilOffsetHours * 60 * 60 * 1000;
        const endBrazilUtcMillis = Date.UTC(year, month, 0, 23, 59, 59, 999) + brazilOffsetHours * 60 * 60 * 1000;
        const startUtc = new Date(startBrazilUtcMillis);
        const endUtc = new Date(endBrazilUtcMillis);

        // Buscar todos os relatórios do mês
        const reports = await this.prisma.report.findMany({
            where: { 
                celulaId,
                createdAt: {
                    gte: startUtc,
                    lte: endUtc
                }
            },
            orderBy: { createdAt: 'asc' },
            include: { 
                attendances: { 
                    include: { 
                        member: {
                            include: {
                                ministryPosition: true
                            }
                        } 
                    } 
                } 
            }
        });

        // Buscar todos os membros da célula
        const allMembers = await this.prisma.member.findMany({
            where: { celulaId },
            orderBy: { name: 'asc' },
            include: {
                ministryPosition: true
            }
        });

        // Transformar os dados para incluir presentes e ausentes
        const reportsData = reports.map(r => {
            const presentIds = new Set((r.attendances || []).map(a => a.memberId));
            const present = (r.attendances || []).map(a => a.member);
            const absent = allMembers.filter(m => !presentIds.has(m.id));

            return {
                date: r.createdAt,
                present,
                absent
            };
        });

        return {
            reports: reportsData,
            allMembers
        };
    }

}
