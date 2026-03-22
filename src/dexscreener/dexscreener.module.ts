import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DEX_SIGNAL_PROVIDER } from './providers/dex-signal-provider.interface';
import { DexscreenerSignalProvider } from './providers/dexscreener-signal.provider';
import { DexscreenerService } from './dexscreener.service';

@Module({
  imports: [HttpModule],
  providers: [
    DexscreenerService,
    DexscreenerSignalProvider,
    {
      provide: DEX_SIGNAL_PROVIDER,
      useExisting: DexscreenerSignalProvider,
    },
  ],
  exports: [DexscreenerService, DEX_SIGNAL_PROVIDER],
})
export class DexscreenerModule {}
