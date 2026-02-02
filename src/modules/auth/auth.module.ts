import { Module, forwardRef } from '@nestjs/common';
import { CommonModule } from '../common';
import { ConfigModule } from '../config/config.module';
import { MemberModule } from '../member/member.module';
import { MatrixModule } from '../matrix/matrix.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [
        CommonModule,
        ConfigModule,
        MatrixModule,
        forwardRef(() => MemberModule)
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService]
})
export class AuthModule {}
