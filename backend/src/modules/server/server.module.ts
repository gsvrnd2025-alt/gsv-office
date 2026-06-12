import { Module } from '@nestjs/common';
import { ServerController, PublicSettingsController } from './server.controller';
import { ServerService } from './server.service';

@Module({ imports: [], controllers: [ServerController, PublicSettingsController], providers: [ServerService], exports: [ServerService] })
export class ServerModule {}
