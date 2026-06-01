import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats')
  @RequirePermissions(['dashboard', 'view'])
  getStats() { return this.svc.getStats(); }

  @Get('activity')
  @RequirePermissions(['dashboard', 'view'])
  getActivity() { return this.svc.getRecentActivity(); }

  @Get('revenue')
  @RequirePermissions(['dashboard', 'view_financials'])
  getRevenue() { return this.svc.getMonthlyRevenue(); }

  @Get('ticket-trends')
  @RequirePermissions(['dashboard', 'view'])
  getTicketTrends() { return this.svc.getTicketTrends(); }
}
