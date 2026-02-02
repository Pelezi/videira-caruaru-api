import { Module } from '@nestjs/common';
import { MatrixController } from './controller/matrix.controller';
import { MatrixService } from './service/matrix.service';
import { CommonModule } from '../common';

@Module({
    imports: [CommonModule],
    controllers: [MatrixController],
    providers: [MatrixService],
    exports: [MatrixService],
})
export class MatrixModule { }
