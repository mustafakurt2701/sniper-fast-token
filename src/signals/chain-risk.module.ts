import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SolanaRiskService } from './solana-risk.service';

@Module({
  imports: [HttpModule],
  providers: [SolanaRiskService],
  exports: [SolanaRiskService],
})
export class ChainRiskModule {}
