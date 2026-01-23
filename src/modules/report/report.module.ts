import { Module } from '@nestjs/common';
import { CommonModule } from '../common';
import { ReportController, ReportGlobalController } from './controller/report.controller';
import { ReportService } from './service/report.service';

@Module({
    imports: [CommonModule],
    controllers: [ReportController, ReportGlobalController],
    providers: [ReportService],
    exports: [ReportService]
})
export class ReportModule {}
