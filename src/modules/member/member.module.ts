import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '../common';
import { ConfigModule } from '../config/config.module';
import { MemberController } from './controller/member.controller';
import { MemberService } from './service/member.service';
import { MatrixModule } from '../matrix/matrix.module';

@Module({
    imports: [
        CommonModule, 
        ConfigModule,
        HttpModule,
        MatrixModule,
        forwardRef(() => import('../auth/auth.module').then(m => m.AuthModule))
    ],
    controllers: [MemberController],
    providers: [MemberService],
    exports: [MemberService]
})
export class MemberModule {}
