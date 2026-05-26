import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;
    const userAgent = request.get('user-agent');

    // Only audit mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap((data) => {
          // Heuristic to get entity name from URL
          const pathParts = url.split('?')[0].split('/');
          const entity = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'Unknown';
          
          let action = '';
          switch (method) {
            case 'POST': action = 'CREATE'; break;
            case 'PUT':
            case 'PATCH': action = 'UPDATE'; break;
            case 'DELETE': action = 'DELETE'; break;
          }

          this.auditService.log({
            action,
            entity,
            entityId: data?.id?.toString() || body?.id?.toString() || null,
            newData: method !== 'DELETE' ? body : null,
            userId: user?.id || null,
            ipAddress: ip,
            userAgent,
          }).catch(err => console.error('Audit Log Error:', err));
        }),
      );
    }

    return next.handle();
  }
}
