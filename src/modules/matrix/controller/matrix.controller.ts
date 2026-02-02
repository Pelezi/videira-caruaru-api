import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatrixService } from '../service/matrix.service';
import { MatrixCreateInput, MatrixUpdateInput } from '../model/matrix.input';

@ApiTags('Matrix')
@Controller('matrix')
export class MatrixController {
    constructor(private readonly matrixService: MatrixService) { }

    @Get()
    @ApiOperation({ summary: 'Get all matrices' })
    @ApiResponse({ status: 200, description: 'Returns all matrices' })
    public async findAll() {
        return this.matrixService.findAll();
    }

    @Get('by-current-domain')
    @ApiOperation({ summary: 'Get matrix by current domain (public endpoint)' })
    @ApiResponse({ status: 200, description: 'Returns matrix information' })
    public async findByCurrentDomain(@Headers('origin') origin: string) {
        const matrix = await this.matrixService.findByDomain(origin);
        if (!matrix) {
            return { name: '' };
        }
        return { id: matrix.id, name: matrix.name };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get matrix by ID' })
    @ApiResponse({ status: 200, description: 'Returns matrix' })
    @ApiResponse({ status: 404, description: 'Matrix not found' })
    public async findById(@Param('id') id: string) {
        return this.matrixService.findById(Number(id));
    }

    @Get('domain/:domain')
    @ApiOperation({ summary: 'Get matrix by domain' })
    @ApiResponse({ status: 200, description: 'Returns matrix' })
    public async findByDomain(@Param('domain') domain: string) {
        return this.matrixService.findByDomain(domain);
    }

    @Post()
    @ApiOperation({ summary: 'Create new matrix' })
    @ApiResponse({ status: 201, description: 'Matrix created' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    public async create(@Body() data: MatrixCreateInput) {
        return this.matrixService.create(data);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update matrix' })
    @ApiResponse({ status: 200, description: 'Matrix updated' })
    @ApiResponse({ status: 404, description: 'Matrix not found' })
    public async update(@Param('id') id: string, @Body() data: MatrixUpdateInput) {
        return this.matrixService.update(Number(id), data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete matrix' })
    @ApiResponse({ status: 204, description: 'Matrix deleted' })
    @ApiResponse({ status: 404, description: 'Matrix not found' })
    public async delete(@Param('id') id: string) {
        await this.matrixService.delete(Number(id));
    }

    @Post(':matrixId/members/:memberId')
    @ApiOperation({ summary: 'Add member to matrix' })
    @ApiResponse({ status: 201, description: 'Member added to matrix' })
    public async addMember(
        @Param('matrixId') matrixId: string,
        @Param('memberId') memberId: string
    ) {
        return this.matrixService.addMemberToMatrix(Number(memberId), Number(matrixId));
    }

    @Delete(':matrixId/members/:memberId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove member from matrix' })
    @ApiResponse({ status: 204, description: 'Member removed from matrix' })
    public async removeMember(
        @Param('matrixId') matrixId: string,
        @Param('memberId') memberId: string
    ) {
        await this.matrixService.removeMemberFromMatrix(Number(memberId), Number(matrixId));
    }

    @Get('members/:memberId/matrices')
    @ApiOperation({ summary: 'Get all matrices for a member' })
    @ApiResponse({ status: 200, description: 'Returns member matrices' })
    public async getMemberMatrices(@Param('memberId') memberId: string) {
        return this.matrixService.getMemberMatrices(Number(memberId));
    }
}
