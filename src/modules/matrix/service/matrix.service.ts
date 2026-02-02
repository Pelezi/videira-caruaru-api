import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common';
import { MatrixCreateInput, MatrixUpdateInput } from '../model/matrix.input';

@Injectable()
export class MatrixService {
    constructor(private readonly prisma: PrismaService) { }

    public async findAll() {
        return this.prisma.matrix.findMany({
            include: {
                domains: true,
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    public async findById(id: number) {
        const matrix = await this.prisma.matrix.findUnique({
            where: { id },
            include: {
                domains: true,
                _count: {
                    select: { members: true }
                }
            }
        });

        if (!matrix) {
            throw new HttpException('Matrix not found', HttpStatus.NOT_FOUND);
        }

        return matrix;
    }

    /**
     * Normalizes a domain string by removing protocol, port, and www prefix
     * Examples:
     * - "https://videira-caruaru.com" -> "videira-caruaru.com"
     * - "http://localhost:3000" -> "localhost"
     * - "www.example.com:8080" -> "example.com"
     */
    private normalizeDomain(rawDomain: string): string {
        if (!rawDomain) return '';
        
        let normalized = rawDomain.toLowerCase().trim();
        
        // Remove protocol (http://, https://)
        normalized = normalized.replace(/^https?:\/\//, '');
        
        // Remove port
        normalized = normalized.replace(/:\d+$/, '');
        
        // Remove www. prefix
        normalized = normalized.replace(/^www\./, '');
        
        // Remove trailing slash
        normalized = normalized.replace(/\/$/, '');
        
        return normalized;
    }

    public async findByDomain(domain: string) {
        const normalizedDomain = this.normalizeDomain(domain);
        
        const matrixDomain = await this.prisma.matrixDomain.findUnique({
            where: { domain: normalizedDomain },
            include: {
                matrix: {
                    include: {
                        domains: true
                    }
                }
            }
        });

        return matrixDomain?.matrix || null;
    }

    public async create(data: MatrixCreateInput) {
        if (!data.domains || data.domains.length === 0) {
            throw new HttpException('At least one domain is required', HttpStatus.BAD_REQUEST);
        }

        // Normalize all domains before checking/saving
        const normalizedDomains = data.domains.map(d => this.normalizeDomain(d));

        // Verificar se algum domínio já existe
        const existingDomains = await this.prisma.matrixDomain.findMany({
            where: {
                domain: { in: normalizedDomains }
            }
        });

        if (existingDomains.length > 0) {
            throw new HttpException(
                `Domain(s) already exist: ${existingDomains.map(d => d.domain).join(', ')}`,
                HttpStatus.BAD_REQUEST
            );
        }

        return this.prisma.matrix.create({
            data: {
                name: data.name,
                domains: {
                    create: normalizedDomains.map(domain => ({ domain }))
                }
            },
            include: {
                domains: true
            }
        });
    }

    public async update(id: number, data: MatrixUpdateInput) {
        await this.findById(id); // Verificar se existe

        const updateData: any = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }

        if (data.domains !== undefined) {
            // Normalize all domains before checking/saving
            const normalizedDomains = data.domains.map(d => this.normalizeDomain(d));

            // Verificar se algum dos novos domínios já existe em outra matrix
            const existingDomains = await this.prisma.matrixDomain.findMany({
                where: {
                    domain: { in: normalizedDomains },
                    matrixId: { not: id }
                }
            });

            if (existingDomains.length > 0) {
                throw new HttpException(
                    `Domain(s) already exist in another matrix: ${existingDomains.map(d => d.domain).join(', ')}`,
                    HttpStatus.BAD_REQUEST
                );
            }

            // Deletar domínios antigos e criar novos
            await this.prisma.matrixDomain.deleteMany({
                where: { matrixId: id }
            });

            updateData.domains = {
                create: normalizedDomains.map(domain => ({ domain }))
            };
        }

        return this.prisma.matrix.update({
            where: { id },
            data: updateData,
            include: {
                domains: true
            }
        });
    }

    public async delete(id: number) {
        await this.findById(id); // Verificar se existe

        // Verificar se há membros associados
        const memberCount = await this.prisma.memberMatrix.count({
            where: { matrixId: id }
        });

        if (memberCount > 0) {
            throw new HttpException(
                'Cannot delete matrix with associated members',
                HttpStatus.BAD_REQUEST
            );
        }

        await this.prisma.matrix.delete({
            where: { id }
        });
    }

    public async addMemberToMatrix(memberId: number, matrixId: number) {
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member) {
            throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
        }

        await this.findById(matrixId);

        const existing = await this.prisma.memberMatrix.findFirst({
            where: {
                memberId,
                matrixId
            }
        });

        if (existing) {
            throw new HttpException('Member already in this matrix', HttpStatus.BAD_REQUEST);
        }

        return this.prisma.memberMatrix.create({
            data: {
                memberId,
                matrixId
            },
            include: {
                member: true,
                matrix: {
                    include: {
                        domains: true
                    }
                }
            }
        });
    }

    public async removeMemberFromMatrix(memberId: number, matrixId: number) {
        const memberMatrix = await this.prisma.memberMatrix.findFirst({
            where: {
                memberId,
                matrixId
            }
        });

        if (!memberMatrix) {
            throw new HttpException('Member not in this matrix', HttpStatus.NOT_FOUND);
        }

        await this.prisma.memberMatrix.delete({
            where: { id: memberMatrix.id }
        });
    }

    public async getMemberMatrices(memberId: number) {
        const memberMatrices = await this.prisma.memberMatrix.findMany({
            where: { memberId },
            include: {
                matrix: {
                    include: {
                        domains: true
                    }
                }
            }
        });

        return memberMatrices.map(mm => mm.matrix);
    }
}
