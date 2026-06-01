import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { PurchaseService } from './purchase.service';

@ApiTags('Purchase')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private svc: PurchaseService) {}
  @Get('orders') @RequirePermissions(['purchase', 'read']) getPOs(@Query() q: any) { return this.svc.getPOs(q); }
  @Post('orders') @RequirePermissions(['purchase', 'create']) createPO(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.createPO(dto, userId); }
  @Get('suppliers') @RequirePermissions(['purchase', 'manage_suppliers']) getSuppliers() { return this.svc.getSuppliers(); }
  @Post('suppliers') @RequirePermissions(['purchase', 'manage_suppliers']) createSupplier(@Body() dto: any) { return this.svc.createSupplier(dto); }
}
