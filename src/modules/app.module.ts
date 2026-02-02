import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { CommonModule } from './common';
import { AuthModule } from './auth/auth.module';
import { CelulaModule } from './celula/celula.module';
import { DiscipuladoModule } from './discipulado/discipulado.module';
import { RedeModule } from './rede/rede.module';
import { MemberModule } from './member/member.module';
import { ReportModule } from './report/report.module';
import { ConfigModule } from './config/config.module';
import { ExternalModule } from './external/external.module';
import { MatrixModule } from './matrix/matrix.module';
import { MatrixValidationMiddleware } from './common/middleware/matrix-validation.middleware';

@Module({
    imports: [
        CommonModule,
        AuthModule,
        MatrixModule,
        CelulaModule,
        DiscipuladoModule,
        RedeModule,
        MemberModule,
        ReportModule,
        ConfigModule,
        ExternalModule,
    ]
})
export class ApplicationModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(MatrixValidationMiddleware)
            .forRoutes('*');
    }
}
