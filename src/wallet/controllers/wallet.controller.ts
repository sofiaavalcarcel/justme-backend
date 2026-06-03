import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { WalletService } from '../services/wallet.service';

@ApiTags('Billetera Operativa')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @Get(':professionalId')
    @ApiOperation({ summary: 'Obtener saldo operativo y historial de transacciones' })
    getWallet(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.walletService.getWalletWithTransactions(professionalId);
    }

    @Get(':professionalId/can-book')
    @ApiOperation({ summary: 'Verificar si el profesional puede recibir nuevas reservas (balance > 0)' })
    canBook(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.walletService.canAcceptBookings(professionalId);
    }

    @Post(':professionalId/recharge')
    @ApiOperation({ summary: 'Recargar saldo operativo (solo desde PaymentsService vía Stripe)' })
    async recharge(
        @Param('professionalId', ParseIntPipe) professionalId: number,
        @Body('amount') amount: number,
    ) {
        return this.walletService.topUp(professionalId, amount);
    }
}
