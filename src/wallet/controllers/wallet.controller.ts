import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { WalletService } from '../services/wallet.service';

@ApiTags('Billetera')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @Get(':professionalId')
    @ApiOperation({ summary: 'Obtener balance y transacciones de la billetera' })
    getWallet(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.walletService.getWalletWithTransactions(professionalId);
    }

    @Post(':professionalId/recharge')
    @ApiOperation({ summary: 'Recargar billetera' })
    async recharge(
        @Param('professionalId', ParseIntPipe) professionalId: number,
        @Body('amount') amount: number,
    ) {
        try {
            return await this.walletService.recharge(professionalId, amount);
        } catch (error) {
            console.error('DEBUG - Recharge Controller Error:', error);
            return {
                error: true,
                message: error.message,
                stack: error.stack,
                details: 'This is a debug response to trace the 500 error'
            };
        }
    }
}
