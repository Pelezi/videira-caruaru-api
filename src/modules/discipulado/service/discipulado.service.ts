import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common';
import { DiscipuladoCreateInput } from '../model/discipulado.input';
import { canBeDiscipulador, getMinistryTypeLabel } from '../../common/helpers/ministry-permissions.helper';

@Injectable()
export class DiscipuladoService {
    constructor(private readonly prisma: PrismaService) {}

    public async findAll() {
        return this.prisma.discipulado.findMany({ 
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
        if (data.discipuladorMemberId) {
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
                discipuladorMemberId: data.discipuladorMemberId 
            } 
        });
    }

    public async update(id: number, data: Partial<DiscipuladoCreateInput>) {
        if (data.discipuladorMemberId !== undefined && data.discipuladorMemberId !== null) {
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
