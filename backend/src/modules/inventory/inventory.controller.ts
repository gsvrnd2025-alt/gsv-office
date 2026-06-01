import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private svc: InventoryService) {}
  @Get('products') @RequirePermissions(['inventory', 'read']) getProducts(@Query() q: any) { return this.svc.getProducts(q); }
  @Get('categories') @RequirePermissions(['inventory', 'read']) getCategories() { return this.svc.getCategories(); }
  @Post('products') @RequirePermissions(['inventory', 'create']) create(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.createProduct(dto, userId); }
  @Put('products/:id') @RequirePermissions(['inventory', 'update']) update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.updateProduct(id, dto); }
  @Patch('products/:id/stock') @RequirePermissions(['inventory', 'adjust_stock']) adjustStock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.adjustStock(id, dto, userId); }
}
