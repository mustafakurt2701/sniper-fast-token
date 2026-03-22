import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { IngestSignalDto } from './dto/ingest-signal.dto';
import { SignalPayload } from './signal.types';
import { SignalsService } from './signals.service';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('preview')
  preview(): Promise<SignalPayload[]> {
    return this.signalsService.previewSignals();
  }

  @Post('scan')
  scan(): Promise<SignalPayload[]> {
    return this.signalsService.scanOnce();
  }

  @Post('ingest')
  ingest(@Body() body: IngestSignalDto): Promise<SignalPayload | null> {
    return this.signalsService.ingestPair(body.pair as DexscreenerPair);
  }

  @Post('test-telegram')
  testTelegram(@Query('query') query?: string): Promise<SignalPayload | null> {
    return this.signalsService.sendTestSignal(query);
  }
}
