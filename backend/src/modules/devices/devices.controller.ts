import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { Device } from './device.entity';

@ApiTags('RMM Devices')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all paired RMM devices' })
  async getAll(): Promise<{ success: boolean; data: Device[] }> {
    const list = await this.devicesService.findAll();
    return { success: true, data: list };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single device status and metrics' })
  async getOne(@Param('id') id: string): Promise<{ success: boolean; data: Device }> {
    const dev = await this.devicesService.findById(id);
    return { success: true, data: dev };
  }

  @Post()
  @ApiOperation({ summary: 'Register/pair a new device agent' })
  async register(@Body() body: Partial<Device>): Promise<{ success: boolean; data: Device }> {
    const dev = await this.devicesService.create(body);
    return { success: true, data: dev };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update device details/configurations' })
  async update(@Param('id') id: string, @Body() body: Partial<Device>): Promise<{ success: boolean; data: Device }> {
    const dev = await this.devicesService.update(id, body);
    return { success: true, data: dev };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpair and remove device' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.devicesService.delete(id);
  }

  @Post(':id/metrics')
  @ApiOperation({ summary: 'Update running metrics from agent' })
  async updateMetrics(
    @Param('id') id: string,
    @Body() body: {
      cpuUsage: number;
      ramUsage: number;
      gpuUsage?: number;
      diskUsage?: number;
      status?: 'online' | 'offline';
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean; data: Device }> {
    const dev = await this.devicesService.updateMetrics(id, body);
    return { success: true, data: dev };
  }

  @Post(':id/action')
  @ApiOperation({ summary: 'Trigger a remote action/command' })
  async triggerAction(
    @Param('id') id: string,
    @Body() body: { action: string; payload?: any },
  ): Promise<{ success: boolean; message: string; output?: any }> {
    // In a real RMM, this sends a socket event to the agent.
    // For our simulated endpoints, we return a success response with mock logs.
    const dev = await this.devicesService.findById(id);
    
    let message = `Action '${body.action}' executed successfully on ${dev.name}.`;
    let output = '';

    switch (body.action) {
      case 'reboot':
        message = `Reboot command sent to ${dev.name}. Agent is restarting.`;
        break;
      case 'shutdown':
        message = `Shutdown command sent to ${dev.name}.`;
        break;
      case 'lock':
        message = `Workstation locked on ${dev.name}.`;
        break;
      case 'logoff':
        message = `User session logged off on ${dev.name}.`;
        break;
      case 'shell':
        output = this.executeMockShellCommand(body.payload?.command || 'dir');
        break;
      default:
        message = `Action ${body.action} dispatched.`;
    }

    return { success: true, message, output };
  }

  private executeMockShellCommand(cmd: string): string {
    const clean = cmd.trim().toLowerCase();
    if (clean === 'ipconfig') {
      return `
Windows IP Configuration

Ethernet adapter Ethernet0:
   Connection-specific DNS Suffix  . : localdomain
   IPv4 Address. . . . . . . . . . . : 192.168.0.231
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.0.1
`;
    }
    if (clean === 'systeminfo') {
      return `
Host Name:                 FINANCE-PC-10
OS Name:                   Microsoft Windows 11 Enterprise
OS Version:                10.0.22631 N/A Build 22631
OS Manufacturer:           Microsoft Corporation
OS Configuration:          Stand-alone Workstation
Product ID:                00329-00000-00000-AA101
System Model:              Custom PC
Processor(s):              1 Processor(s) Installed.
                           [01]: AMD64 Family 25 Model 33 Stepping 0 AuthenticAMD ~3800 Mhz
Total Physical Memory:     16,318 MB
Available Physical Memory: 6,788 MB
Virtual Memory: Max Size:  18,878 MB
`;
    }
    if (clean === 'dir' || clean === 'ls') {
      return `
 Directory of C:\\Program Files\\GSV-Agent

06/04/2026  03:00 AM    <DIR>          .
06/04/2026  03:00 AM    <DIR>          ..
06/04/2026  03:00 AM         2,048,128 gsv-rmm-agent.exe
06/04/2026  02:45 AM            15,488 config.json
06/04/2026  03:01 AM           458,921 logs.txt
               3 File(s)      2,522,537 bytes
               2 Dir(s)  120,489,120,384 bytes free
`;
    }
    return `Command '${cmd}' executed. Standard output successfully piped to diagnostic agent.`;
  }
}
