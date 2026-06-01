import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';

@Module({ imports: [], controllers: [PluginsController], providers: [PluginsService], exports: [PluginsService] })
export class PluginsModule {}
