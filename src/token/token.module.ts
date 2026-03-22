import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TokenEnrichmentService } from './token-enrichment.service';

@Module({
  imports: [HttpModule],
  providers: [TokenEnrichmentService],
  exports: [TokenEnrichmentService],
})
export class TokenModule {}
