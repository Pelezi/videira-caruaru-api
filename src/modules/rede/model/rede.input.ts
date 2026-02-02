import { ApiProperty } from '@nestjs/swagger';

export class RedeCreateInput {
    @ApiProperty({ description: 'Nome da rede', example: 'Rede Norte' })
    public readonly name: string;

    @ApiProperty({ description: 'Member id of the pastor for this rede', required: false })
    public readonly pastorMemberId?: number;

    @ApiProperty({ description: 'Matrix id', required: false })
    public readonly matrixId?: number;
}
