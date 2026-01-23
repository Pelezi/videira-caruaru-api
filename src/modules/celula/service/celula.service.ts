import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common';
import { CelulaCreateInput } from '../model/celula.input';
import { canBeLeader, canBeViceLeader, getMinistryTypeLabel } from '../../common/helpers/ministry-permissions.helper';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class CelulaService {
    constructor(private readonly prisma: PrismaService) { }

    public async findAll() {
        return this.prisma.celula.findMany({ orderBy: { name: 'asc' }, include: { leader: true, viceLeader: true } });
    }

    public async findByPermission(celulaIds: number[]) {
        if (celulaIds.length === 0) return [];

        return this.prisma.celula.findMany({
            where: { id: { in: celulaIds } },
            include: { leader: true, viceLeader: true },
            orderBy: { name: 'asc' }
        });
    }

    public async create(body: CelulaCreateInput) {
        // Validação de weekday
        if (body.weekday === undefined || body.weekday === null) {
            throw new HttpException('Dia da semana é obrigatório', HttpStatus.BAD_REQUEST);
        }
        if (body.weekday < 0 || body.weekday > 6) {
            throw new HttpException('Dia da semana deve estar entre 0 (Domingo) e 6 (Sábado)', HttpStatus.BAD_REQUEST);
        }
        if (!body.leaderMemberId) {
            throw new HttpException('Líder é obrigatório', HttpStatus.BAD_REQUEST);
        }
        if (!body.discipuladoId) {
            throw new HttpException('Discipulado é obrigatório', HttpStatus.BAD_REQUEST);
        }

        // Validação de time
        if (!body.time) {
            throw new HttpException('Horário é obrigatório', HttpStatus.BAD_REQUEST);
        }
        // Valida formato HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(body.time)) {
            throw new HttpException('Horário deve estar no formato HH:mm (ex: 19:30)', HttpStatus.BAD_REQUEST);
        }

        const leader = await this.prisma.member.findUnique({
            where: { id: body.leaderMemberId },
            include: { ministryPosition: true }
        });
        if (!leader) {
            throw new HttpException('Líder não encontrado', HttpStatus.BAD_REQUEST);
        }
        if (!canBeLeader(leader.ministryPosition?.type)) {
            throw new HttpException(
                `Membro não pode ser líder de célula. Nível ministerial atual: ${getMinistryTypeLabel(leader.ministryPosition?.type)}. ` +
                `É necessário ser pelo menos Líder.`,
                HttpStatus.BAD_REQUEST
            );
        }

        const data: Prisma.CelulaUncheckedCreateInput = {
            name: body.name,
            weekday: body.weekday,
            time: body.time,
            leaderMemberId: body.leaderMemberId,
            discipuladoId: body.discipuladoId,
        };

        if (body.viceLeaderMemberId) {
            const viceLeader = await this.prisma.member.findUnique({
                where: { id: body.viceLeaderMemberId },
                include: { ministryPosition: true }
            });
            if (!viceLeader) {
                throw new HttpException('Líder em treinamento não encontrado', HttpStatus.BAD_REQUEST);
            }
            if (!canBeViceLeader(viceLeader.ministryPosition?.type)) {
                throw new HttpException(
                    `Membro não pode ser líder em treinamento. Nível ministerial atual: ${getMinistryTypeLabel(viceLeader.ministryPosition?.type)}. ` +
                    `É necessário ser pelo menos Líder em Treinamento.`,
                    HttpStatus.BAD_REQUEST
                );
            }
            data.viceLeaderMemberId = body.viceLeaderMemberId;
        }

        return this.prisma.celula.create({ data: data, include: { leader: true, viceLeader: true, discipulado: true } });
    }

    public async findById(id: number) {
        return this.prisma.celula.findUnique({ where: { id }, include: { leader: true, viceLeader: true, discipulado: true } });
    }

    public async findMembersByCelulaId(celulaId: number) {
        return this.prisma.member.findMany({
            where: { celulaId },
            orderBy: { name: 'asc' },
            include: {
                ministryPosition: true,
                winnerPath: true,
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }

    public async update(id: number, data: { name?: string; leaderMemberId?: number; discipuladoId?: number; weekday?: number; time?: string }) {
        const updateData: Prisma.CelulaUncheckedUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;

        // Validação de weekday
        if (data.weekday !== undefined) {
            if (data.weekday !== null && (data.weekday < 0 || data.weekday > 6)) {
                throw new HttpException('Dia da semana deve estar entre 0 (Domingo) e 6 (Sábado)', HttpStatus.BAD_REQUEST);
            }
            updateData.weekday = data.weekday;
        }

        // Validação de time
        if (data.time !== undefined) {
            if (data.time !== null && data.time !== '') {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(data.time)) {
                    throw new HttpException('Horário deve estar no formato HH:mm (ex: 19:30)', HttpStatus.BAD_REQUEST);
                }
            }
            updateData.time = data.time;
        }

        if (data.leaderMemberId !== undefined) {
            if (data.leaderMemberId !== null) {
                const leader = await this.prisma.member.findUnique({
                    where: { id: data.leaderMemberId },
                    include: { ministryPosition: true }
                });
                if (!leader) {
                    throw new HttpException('Líder não encontrado', HttpStatus.BAD_REQUEST);
                }
                if (!canBeLeader(leader.ministryPosition?.type)) {
                    throw new HttpException(
                        `Membro não pode ser líder de célula. Nível ministerial atual: ${getMinistryTypeLabel(leader.ministryPosition?.type)}. ` +
                        `É necessário ser pelo menos Líder.`,
                        HttpStatus.BAD_REQUEST
                    );
                }
            }
            updateData.leaderMemberId = data.leaderMemberId;
        }

        // Atualizar discipulado se fornecido
        if (data.discipuladoId !== undefined) {
            if (data.discipuladoId !== null) {
                const discipulado = await this.prisma.discipulado.findUnique({
                    where: { id: data.discipuladoId }
                });
                if (!discipulado) {
                    throw new HttpException('Discipulado não encontrado', HttpStatus.BAD_REQUEST);
                }
            }
            updateData.discipuladoId = data.discipuladoId;
        }

        return this.prisma.celula.update({ where: { id }, data: updateData, include: { leader: true, viceLeader: true, discipulado: { include: { rede: true } } } });
    }

    /**
     * Multiply (split) a celula: create a new celula and move specified members from the original celula
     */
    public async multiply(
        originalCelulaId: number,
        memberIds: number[],
        newCelulaName: string,
        newLeaderMemberId?: number,
        oldLeaderMemberId?: number,
    ) {
        try {
            return this.prisma.$transaction(async (tx) => {
                const original = await tx.celula.findUnique({ where: { id: originalCelulaId } });
                if (!original) {
                    throw new HttpException('Original celula not found', HttpStatus.NOT_FOUND);
                }

                if (oldLeaderMemberId && original.leaderMemberId !== oldLeaderMemberId) {
                    throw new HttpException('Old leader does not match', HttpStatus.BAD_REQUEST);
                }

                if (!newLeaderMemberId) {
                    throw new HttpException('Novo líder é obrigatório ao multiplicar célula', HttpStatus.BAD_REQUEST);
                }

                const leader = await tx.member.findUnique({
                    where: { id: newLeaderMemberId },
                    include: { ministryPosition: true }
                });
                if (!leader) {
                    throw new HttpException('Novo líder não encontrado', HttpStatus.BAD_REQUEST);
                }

                // Se o membro não tem ministry adequado para ser líder, promove automaticamente
                if (!canBeLeader(leader.ministryPosition.type)) {
                    // Busca uma Ministry com type LEADER
                    let leaderMinistry = await tx.ministry.findFirst({
                        where: { type: 'LEADER' }
                    });

                    // Se não existir, cria uma
                    if (!leaderMinistry) {
                        throw new HttpException('Posição ministerial para Líder não encontrada. Contate o administrador do sistema.', HttpStatus.INTERNAL_SERVER_ERROR);
                    }

                    // Atualiza o membro para ter a posição de Líder
                    await tx.member.update({
                        where: { id: newLeaderMemberId },
                        data: { ministryPositionId: leaderMinistry.id }
                    });
                }

                // create new celula
                const createData: Prisma.CelulaUncheckedCreateInput = {
                    name: newCelulaName,
                    discipuladoId: original.discipuladoId,
                    leaderMemberId: newLeaderMemberId
                };
                const newCelula = await tx.celula.create({
                    data: createData,
                    include: { leader: true }
                });

                // ensure members belong to the original celula
                const validMembers = await tx.member.findMany({ where: { id: { in: memberIds }, celulaId: originalCelulaId } });
                const validIds = validMembers.map(m => m.id);

                if (validIds.length === 0) {
                    throw new HttpException('No provided members belong to the original celula', HttpStatus.BAD_REQUEST);
                }

                await tx.member.updateMany({ where: { id: { in: validIds } }, data: { celulaId: newCelula.id } });

                return {
                    newCelula,
                    movedCount: validIds.length,
                    movedMemberIds: validIds
                };
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            const status = (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') ? error.status : HttpStatus.BAD_REQUEST;
            throw new HttpException(`Erro ao multiplicar célula: ${message}`, status);
        }
    }

    public async delete(id: number): Promise<void> {
        // Do not allow deletion if there are any members at all
        const memberCount = await this.prisma.member.count({ where: { celulaId: id } });
        if (memberCount > 0) {
            throw new HttpException('Esta célula possui membros vinculados e não pode ser excluída.', HttpStatus.BAD_REQUEST);
        }

        // safe to delete
        await this.prisma.report.deleteMany({ where: { celulaId: id } });
        await this.prisma.celula.delete({ where: { id } });
    }

}
