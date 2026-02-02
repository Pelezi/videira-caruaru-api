import { ApiProperty } from '@nestjs/swagger';

export class DiscipuladoCreateInput {
    @ApiProperty({ description: 'Nome do discipulado', example: 'Discipulado Norte' })
    public readonly name: string;

    @ApiProperty({ description: 'Rede (network) id this discipulado belongs to', example: 1 })
    public readonly redeId: number;

    @ApiProperty({ description: 'User id of discipulador', required: true, example: 2 })
    public readonly discipuladorMemberId: number;

    @ApiProperty({ description: 'Matrix id', required: false })
    public readonly matrixId?: number;
}
