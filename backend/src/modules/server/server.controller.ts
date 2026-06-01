import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { ServerService } from './server.service';

@ApiTags('Server')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('server')
export class ServerController {
  constructor(private svc: ServerService) {}
  @Get('info') @RequirePermissions(['server', 'view']) getInfo() { return this.svc.getSystemInfo(); }
  @Get('settings') @RequirePermissions(['server', 'view']) getSettings() { return this.svc.getSettings(); }
  @Get('db-status') @RequirePermissions(['server', 'view']) getDbStatus() { return this.svc.getDatabaseStatus(); }
  @Put('settings/:key') @RequirePermissions(['server', 'configure']) updateSetting(@Param('key') key: string, @Body('value') value: string, @CurrentUser('id') userId: string) { return this.svc.updateSetting(key, value, userId); }
}

// Public settings controller (no auth required for branding)
import { Controller as C2, Get as G2 } from '@nestjs/common';
@ApiTags('Server')
@C2('public')
export class PublicSettingsController {
  constructor(private svc: ServerService) {}
  @Public() @G2('settings') getPublic() { return this.svc.getPublicSettings(); }
}
