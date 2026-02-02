import { Module } from '@nestjs/common';
import { CommonModule } from '../common';
import { ExternalController } from './controller/external.controller';
import { ExternalService } from './service/external.service';

@Module({
    imports: [CommonModule],
    controllers: [ExternalController],
    providers: [ExternalService],
    exports: [ExternalService]
})
export class ExternalModule {}
