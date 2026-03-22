import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';

interface RpcResponse<T> {
  result?: T;
}

interface TokenLargestAccountsResult {
  value?: Array<{
    address: string;
    amount: string;
    uiAmount: number | null;
    decimals: number;
    uiAmountString: string;
  }>;
}

interface ParsedAccountInfoResult {
  value?: {
    data?: {
      parsed?: {
        info?: {
          decimals?: number;
          supply?: string;
          mintAuthority?: string | null;
          freezeAuthority?: string | null;
          isInitialized?: boolean;
        };
      };
    };
  } | null;
}

export interface SolanaRiskSnapshot {
  isAvailable: boolean;
  mintAuthorityRenounced?: boolean;
  freezeAuthorityRenounced?: boolean;
  topHolderPct?: number;
  top5HolderPct?: number;
  supply?: number;
}

@Injectable()
export class SolanaRiskService {
  private readonly logger = new Logger(SolanaRiskService.name);
  private readonly config: AppConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async getRiskSnapshot(mintAddress: string): Promise<SolanaRiskSnapshot> {
    try {
      const [parsedMint, largestAccounts] = await Promise.all([
        this.callRpc<ParsedAccountInfoResult>('getAccountInfo', [
          mintAddress,
          { encoding: 'jsonParsed', commitment: 'confirmed' },
        ]),
        this.callRpc<TokenLargestAccountsResult>('getTokenLargestAccounts', [
          mintAddress,
          { commitment: 'confirmed' },
        ]),
      ]);

      const info = parsedMint.result?.value?.data?.parsed?.info;
      const rawSupply = info?.supply ? Number(info.supply) : 0;
      const decimals = info?.decimals ?? 0;
      const normalizedSupply = decimals > 0 ? rawSupply / 10 ** decimals : rawSupply;

      const holders = largestAccounts.result?.value ?? [];
      const normalizedBalances = holders
        .map((holder) => {
          if (holder.uiAmount != null) {
            return holder.uiAmount;
          }

          const uiAmount = Number(holder.uiAmountString || '0');
          return Number.isFinite(uiAmount) && uiAmount > 0
            ? uiAmount
            : Number(holder.amount || '0');
        })
        .filter((value) => Number.isFinite(value));

      const topHolderPct =
        normalizedSupply > 0 && normalizedBalances.length > 0
          ? (normalizedBalances[0] / normalizedSupply) * 100
          : undefined;
      const top5HolderPct =
        normalizedSupply > 0
          ? (normalizedBalances.slice(0, 5).reduce((sum, value) => sum + value, 0) /
              normalizedSupply) *
            100
          : undefined;

      return {
        isAvailable: true,
        mintAuthorityRenounced: info?.mintAuthority == null,
        freezeAuthorityRenounced: info?.freezeAuthority == null,
        topHolderPct: topHolderPct !== undefined ? Number(topHolderPct.toFixed(2)) : undefined,
        top5HolderPct: top5HolderPct !== undefined ? Number(top5HolderPct.toFixed(2)) : undefined,
        supply: normalizedSupply > 0 ? normalizedSupply : undefined,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Solana risk snapshot failed for ${mintAddress}: ${reason}`);
      return { isAvailable: false };
    }
  }

  private async callRpc<T>(method: string, params: unknown[]): Promise<RpcResponse<T>> {
    const response = await firstValueFrom(
      this.httpService.post<RpcResponse<T>>(
        this.config.solanaRpcUrl,
        {
          jsonrpc: '2.0',
          id: `${method}-${Date.now()}`,
          method,
          params,
        },
        {
          timeout: 2500,
        },
      ),
    );

    return response.data;
  }
}
