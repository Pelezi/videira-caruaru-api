import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common';
import * as CelulaData from '../model';
import { canBeLeader, canBeViceLeader, getMinistryTypeLabel } from '../../common/helpers/ministry-permissions.helper';
import { Prisma } from '../../../generated/prisma/client';
import { createMatrixValidator } from '../../common/helpers/matrix-validation.helper';

@Injectable()
export class CelulaService {
    constructor(private readonly prisma: PrismaService) { }

    public async findAll(matrixId: number, filters?: CelulaData.CelulaFilterInput) {

        let where: Prisma.CelulaWhereInput = { matrixId };

        if (filters) {
            if (filters.viceLeaderMemberId) {
                where.leadersInTraining = { some: { memberId: Number(filters.viceLeaderMemberId) } };
            }
            if (filters.leaderMemberId) {
                where.leaderMemberId = Number(filters.leaderMemberId);
            }
            if (filters.discipuladoId) {
                where.discipuladoId = Number(filters.discipuladoId);
            }
            if (filters.redeId) {
                where.discipulado = { redeId: Number(filters.redeId) };
            }
            if (filters.celulaIds && filters.celulaIds.length > 0) {
                where.id = { in: filters.celulaIds };
            }
        }

        // MANDATORY: Filter by matrixId to prevent cross-matrix access
        return this.prisma.celula.findMany({ 
            where, 
            orderBy: { name: 'asc' }, 
            include: { 
                leader: true, 
                viceLeader: true,
                leadersInTraining: { include: { member: true } }
            } 
        });
    }

    public async findByPermission(celulaIds: number[]) {
        if (celulaIds.length === 0) return [];

        return this.prisma.celula.findMany({
            where: { id: { in: celulaIds } },
            include: { 
                leader: true, 
                viceLeader: true,
                leadersInTraining: { include: { member: true } }
            },
            orderBy: { name: 'asc' }
        });
    }

    public async create(body: CelulaData.CelulaCreateInput, matrixId: number) {
        const validator = createMatrixValidator(this.prisma);
        
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

        // Validate discipulado belongs to same matrix
        await validator.validateDiscipuladoBelongsToMatrix(body.discipuladoId, matrixId);
        
        // Validate leader belongs to same matrix
        await validator.validateMemberBelongsToMatrix(body.leaderMemberId, matrixId);

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
            matrixId,
            country: body.country,
            zipCode: body.zipCode,
            street: body.street,
            streetNumber: body.streetNumber,
            neighborhood: body.neighborhood,
            city: body.city,
            complement: body.complement,
            state: body.state,
        };

        if (body.viceLeaderMemberId) {
            // Validate vice leader belongs to same matrix
            await validator.validateMemberBelongsToMatrix(body.viceLeaderMemberId, matrixId);
            
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
                },
                celula: {
                    include: {
                        discipulado: {
                            include: {
                                rede: true,
                                discipulador: true
                            }
                        }
                    }
                }
            }
        });
    }

    public async update(id: number, data: {
        name?: string;
        leaderMemberId?: number;
        discipuladoId?: number;
        leaderInTrainingIds?: number[];
        weekday?: number;
        time?: string;
        country?: string;
        zipCode?: string;
        street?: string;
        streetNumber?: string;
        neighborhood?: string;
        city?: string;
        complement?: string;
        state?: string;
    }, matrixId: number) {
        const validator = createMatrixValidator(this.prisma);
        
        // Validate the celula being updated belongs to the matrix
        await validator.validateCelulaBelongsToMatrix(id, matrixId);
        
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

        // Address fields
        if (data.country !== undefined) updateData.country = data.country;
        if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
        if (data.street !== undefined) updateData.street = data.street;
        if (data.streetNumber !== undefined) updateData.streetNumber = data.streetNumber;
        if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.complement !== undefined) updateData.complement = data.complement;
        if (data.state !== undefined) updateData.state = data.state;

        if (data.leaderMemberId !== undefined) {
            if (data.leaderMemberId !== null) {
                // Validate leader belongs to same matrix
                await validator.validateMemberBelongsToMatrix(data.leaderMemberId, matrixId);
                
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
                // Validate discipulado belongs to same matrix
                await validator.validateDiscipuladoBelongsToMatrix(data.discipuladoId, matrixId);
                
                const discipulado = await this.prisma.discipulado.findUnique({
                    where: { id: data.discipuladoId }
                });
                if (!discipulado) {
                    throw new HttpException('Discipulado não encontrado', HttpStatus.BAD_REQUEST);
                }
            }
            updateData.discipuladoId = data.discipuladoId;
        }

        await this.prisma.celula.update({ where: { id }, data: updateData });

        // Atualizar líderes em treinamento se fornecidos
        if (data.leaderInTrainingIds !== undefined) {
            // Remover todos os líderes em treinamento existentes
            await this.prisma.celulaLeaderInTraining.deleteMany({
                where: { celulaId: id }
            });

            // Adicionar novos líderes em treinamento
            if (data.leaderInTrainingIds.length > 0) {
                // Validar que todos os membros pertencem à célula
                const members = await this.prisma.member.findMany({
                    where: {
                        id: { in: data.leaderInTrainingIds },
                        celulaId: id
                    },
                    include: { ministryPosition: true }
                });

                if (members.length !== data.leaderInTrainingIds.length) {
                    throw new HttpException('Alguns membros selecionados não pertencem a esta célula', HttpStatus.BAD_REQUEST);
                }

                // Verificar se algum membro é o líder
                const celula = await this.prisma.celula.findUnique({ where: { id } });
                if (!celula) {
                    throw new HttpException('Célula não encontrada', HttpStatus.NOT_FOUND);
                }
                const isLeader = data.leaderInTrainingIds.some((memberId: number) => memberId === celula.leaderMemberId);
                if (isLeader) {
                    throw new HttpException('O líder da célula não pode ser líder em treinamento', HttpStatus.BAD_REQUEST);
                }

                // Criar as associações de líderes em treinamento
                await this.prisma.celulaLeaderInTraining.createMany({
                    data: data.leaderInTrainingIds.map((memberId: number) => ({
                        celulaId: id,
                        memberId
                    }))
                });

                // Atualizar cargo ministerial para LEADER_IN_TRAINING se necessário
                const ministryTypeHierarchy = ['VISITOR', 'REGULAR_ATTENDEE', 'MEMBER'];
                for (const member of members) {
                    const currentType = member.ministryPosition?.type;
                    if (currentType && ministryTypeHierarchy.includes(currentType)) {
                        // Buscar cargo de LEADER_IN_TRAINING na mesma matriz
                        const leaderInTrainingMinistry = await this.prisma.ministry.findFirst({
                            where: {
                                matrixId,
                                type: 'LEADER_IN_TRAINING'
                            }
                        });

                        if (leaderInTrainingMinistry) {
                            await this.prisma.member.update({
                                where: { id: member.id },
                                data: { ministryPositionId: leaderInTrainingMinistry.id }
                            });
                        }
                    }
                }
            }
        }

        return this.prisma.celula.findUnique({ 
            where: { id }, 
            include: { 
                leader: true, 
                viceLeader: true, 
                discipulado: { include: { rede: true } },
                leadersInTraining: { include: { member: true } }
            } 
        });
    }

    /**
     * Multiply (split) a celula: create a new celula and move specified members from the original celula
     */
    public async multiply(
        originalCelulaId: number,
        memberIds: number[],
        newCelulaName: string,
        matrixId: number,
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
                    leaderMemberId: newLeaderMemberId,
                    matrixId
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
