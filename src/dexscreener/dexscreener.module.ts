import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DexscreenerService } from './dexscreener.service';

@Module({
  imports: [HttpModule],
  providers: [DexscreenerService],
  exports: [DexscreenerService],
})
export class DexscreenerModule {}
