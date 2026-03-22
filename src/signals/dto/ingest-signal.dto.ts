import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class TokenDto {
  @IsString()
  address!: string;

  @IsString()
  name!: string;

  @IsString()
  symbol!: string;
}

class TxnWindowDto {
  @IsOptional()
  @IsNumber()
  buys?: number;

  @IsOptional()
  @IsNumber()
  sells?: number;
}

class PriceMapDto {
  @IsOptional()
  @IsNumber()
  m5?: number;
}

class LiquidityDto {
  @IsOptional()
  @IsNumber()
  usd?: number;

  @IsOptional()
  @IsNumber()
  base?: number;

  @IsOptional()
  @IsNumber()
  quote?: number;
}

class BoostsDto {
  @IsOptional()
  @IsNumber()
  active?: number;
}

class LinkDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

class SocialDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

class InfoDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  websites?: LinkDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialDto)
  socials?: SocialDto[];
}

class PairDto {
  @IsString()
  chainId!: string;

  @IsString()
  dexId!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  pairAddress!: string;

  @ValidateNested()
  @Type(() => TokenDto)
  baseToken!: TokenDto;

  @ValidateNested()
  @Type(() => TokenDto)
  quoteToken!: TokenDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TxnWindowDto)
  txns?: {
    m5?: TxnWindowDto;
  };

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceMapDto)
  volume?: PriceMapDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceMapDto)
  priceChange?: PriceMapDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LiquidityDto)
  liquidity?: LiquidityDto;

  @IsOptional()
  @IsNumber()
  fdv?: number;

  @IsOptional()
  @IsNumber()
  marketCap?: number;

  @IsOptional()
  @IsNumber()
  pairCreatedAt?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BoostsDto)
  boosts?: BoostsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InfoDto)
  info?: InfoDto;
}

export class IngestSignalDto {
  @ValidateNested()
  @Type(() => PairDto)
  pair!: PairDto;
}
