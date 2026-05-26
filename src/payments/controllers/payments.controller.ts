import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { PaymentsService } from '../services/payments.service';

@ApiTags('Pagos')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('intent')
    @ApiOperation({ summary: 'Crear intención de pago' })
    createPaymentIntent(
        @Body() body: { amount: number; currency?: string; metadata?: Record<string, any> },
    ) {
        return this.paymentsService.createPaymentIntent(body.amount, body.currency || 'USD', body.metadata);
    }

    @Post('confirm')
    @ApiOperation({ summary: 'Confirmar pago' })
    confirmPayment(@Body('paymentIntentId') paymentIntentId: string) {
        return this.paymentsService.confirmPayment(paymentIntentId);
    }

    @Post('refund')
    @ApiOperation({ summary: 'Procesar reembolso' })
    processRefund(@Body() body: { paymentIntentId: string; amount?: number }) {
        return this.paymentsService.processRefund(body.paymentIntentId, body.amount);
    }
}
