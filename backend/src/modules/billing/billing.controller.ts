import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}
  @Get('invoices') @RequirePermissions(['billing', 'read']) getInvoices(@Query() q: any) { return this.svc.getInvoices(q); }
  @Get('invoices/:id') @RequirePermissions(['billing', 'read']) getInvoice(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getInvoiceById(id); }
  @Post('invoices') @RequirePermissions(['billing', 'create']) createInvoice(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.createInvoice(dto, userId); }
  @Get('customers') @RequirePermissions(['billing', 'manage_customers']) getCustomers(@Query() q: any) { return this.svc.getCustomers(q); }
  @Post('customers') @RequirePermissions(['billing', 'manage_customers']) createCustomer(@Body() dto: any) { return this.svc.createCustomer(dto); }
  @Post('invoices/:id/payments') @RequirePermissions(['billing', 'manage_payments']) recordPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.recordPayment(id, dto, userId); }
}
