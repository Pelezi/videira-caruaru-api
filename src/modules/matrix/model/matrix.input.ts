import { ApiProperty } from '@nestjs/swagger';

export class MatrixCreateInput {
    @ApiProperty({ description: 'Matrix name', example: 'Igreja Videira Caruaru' })
    public readonly name: string;

    @ApiProperty({ description: 'Matrix domains', example: ['videira-caruaru.com.br', 'localhost:3000'], type: [String] })
    public readonly domains: string[];
}

export class MatrixUpdateInput {
    @ApiProperty({ description: 'Matrix name', example: 'Igreja Videira', required: false })
    public readonly name?: string;

    @ApiProperty({ description: 'Matrix domains', example: ['videira.com.br'], type: [String], required: false })
    public readonly domains?: string[];
}

export class MatrixDomainCreateInput {
    @ApiProperty({ description: 'Domain name', example: 'videira-caruaru.com.br' })
    public readonly domain: string;

    @ApiProperty({ description: 'Matrix ID', example: 1 })
    public readonly matrixId: number;
}
