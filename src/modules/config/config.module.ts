import { Module } from '@nestjs/common';
import { CommonModule } from '../common';
import { RoleController } from './controller/role.controller';
import { MinistryController } from './controller/ministry.controller';
import { WinnerPathController } from './controller/winner-path.controller';
import { ApiKeyController } from './controller/api-key.controller';
import { RoleService } from './service/role.service';
import { MinistryService } from './service/ministry.service';
import { WinnerPathService } from './service/winner-path.service';
import { ApiKeyService } from './service/api-key.service';
import { SecurityConfigService } from './service/security-config.service';

@Module({
    imports: [CommonModule],
    controllers: [RoleController, MinistryController, WinnerPathController, ApiKeyController],
    providers: [RoleService, MinistryService, WinnerPathService, ApiKeyService, SecurityConfigService],
    exports: [RoleService, MinistryService, WinnerPathService, ApiKeyService, SecurityConfigService]
})
export class ConfigModule {}
