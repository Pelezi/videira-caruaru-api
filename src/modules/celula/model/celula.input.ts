import { ApiProperty } from '@nestjs/swagger';

export class CelulaCreateInput {
    
    @ApiProperty({ description: 'Celula name', example: 'Célula Central' })
    public readonly name: string;
    
    @ApiProperty({ description: 'Leader member id (member must exist)', example: 5, required: false })
    public readonly leaderMemberId?: number;
    
    @ApiProperty({ description: 'Discipulado id that this celula belongs to', example: 2, required: false })
    public readonly discipuladoId?: number;

    @ApiProperty({ description: 'id de líder em treinamento (vice líder)', example: 8, required: false })
    public readonly viceLeaderMemberId?: number;

    @ApiProperty({ description: 'Dia da semana da reunião (0=Domingo, 1=Segunda, ..., 6=Sábado)', example: 3 })
    public readonly weekday: number;

    @ApiProperty({ description: 'Horário da reunião (formato HH:mm)', example: '19:30' })
    public readonly time: string;
}

export class CelulaUpdateInput {
    @ApiProperty({ description: 'Celula name', example: 'Célula Nova', required: false })
    public readonly name?: string;
    @ApiProperty({ description: 'Leader member id (member must exist)', example: 6, required: false })
    public readonly leaderMemberId?: number;
    @ApiProperty({ description: 'Discipulado id that this celula belongs to', example: 2, required: false })
    public readonly discipuladoId?: number;
    @ApiProperty({ description: 'Dia da semana da reunião (0=Domingo, 1=Segunda, ..., 6=Sábado)', example: 3, required: false })
    public readonly weekday?: number;
    @ApiProperty({ description: 'Horário da reunião (formato HH:mm)', example: '19:30', required: false })
    public readonly time?: string;
}

export class CelulaMultiplyInput {
    @ApiProperty({ description: 'IDs dos membros a serem movidos para a nova célula', example: [1, 2, 3] })
    public readonly memberIds: number[];

    @ApiProperty({ description: 'Nome da nova célula', example: 'Célula Norte' })
    public readonly newCelulaName: string;
    
    @ApiProperty({ description: 'Leader member id for the new celula', example: 7, required: false })
    public readonly newLeaderMemberId?: number;

    @ApiProperty({ description: 'Leader member id for the original celula (for validation)', example: 5, required: false })
    public readonly oldLeaderMemberId?: number;
}
