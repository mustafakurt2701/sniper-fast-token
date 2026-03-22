import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { ok: boolean; timestamp: string } {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }
}
