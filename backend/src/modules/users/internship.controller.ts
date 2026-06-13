import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UsersService } from './users.service';

@ApiTags('Internship')
@Controller('internship')
export class InternshipController {
  constructor(private usersService: UsersService) {}

  @Public()
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proxy Google Apps Script function calls for local dashboards' })
  async runFunction(@Body() body: { functionName: string; arguments: any[] }) {
    const { functionName, arguments: funcArgs = [] } = body;
    
    try {
      // 1. Fetch Apps Script deployment details from local database
      const settings = await this.usersService.syncSheets().then(() => []).catch(() => []); // fetch fresh or use helper
      
      // Let's query settings directly from DB via usersService or usersRepo
      const deployResult = await (this.usersService as any).usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_deployment_id'`
      );
      let deploymentId = '';
      if (deployResult.length > 0 && deployResult[0].value) {
        deploymentId = deployResult[0].value;
      } else {
        const altDeployResult = await (this.usersService as any).usersRepo.query(
          `SELECT value FROM system_settings WHERE key = 'google_appscript_deployment_id'`
        );
        if (altDeployResult.length > 0) deploymentId = altDeployResult[0].value;
      }

      let syncUrl = 'https://script.google.com/macros/s/AKfycbw6pAarz91qhP5HfTgnustbqF8ftTEpRV0Y03AuwaLRfzoILd3HIeVez0AqerATPyE8/exec';
      if (deploymentId && deploymentId.trim() !== '') {
        syncUrl = `https://script.google.com/macros/s/${deploymentId.trim()}/exec`;
      }

      console.log(`[InternshipController] Proxying function "${functionName}" to Apps Script: ${syncUrl}`);

      // 2. Post execution payload to Apps Script Web App
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'executeFunction',
          functionName,
          arguments: funcArgs
        }),
      });

      if (!response.ok) {
        return {
          status: 'error',
          message: `Google Apps Script returned status ${response.status}`
        };
      }

      const result = await response.json();

      // 3. Asynchronously trigger local database sync to fetch any updated data from Sheets
      // We don't await this so the response is returned immediately to the user
      const isWrite = /save|submit|register|update|record|delete/i.test(functionName);
      if (isWrite) {
        console.log(`[InternshipController] Detected write function "${functionName}". Triggering background sync...`);
        this.usersService.syncSheets().catch(err => {
          console.error('[InternshipController] Background sheets sync failed:', err.message);
        });
      }

      return result;
    } catch (err: any) {
      console.error(`[InternshipController] Error executing function "${functionName}":`, err.message);
      return {
        status: 'error',
        message: `Proxy failed: ${err.message}`
      };
    }
  }
}
