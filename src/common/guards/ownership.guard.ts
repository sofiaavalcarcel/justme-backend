import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Obtener el ID del parámetro de la URL (usualmente string) y convertirlo a número
    const targetUserId = parseInt(request.params.userId, 10);
    
    if (!user) {
        throw new ForbiddenException('User is not authenticated');
    }

    if (isNaN(targetUserId)) {
        return true; // Dejar pasar si la ruta no tiene :userId, la validan otros guards
    }

    // Un Admin puede acceder a los datos de cualquier usuario
    const isAdmin = user.roles?.some((role: any) => role.name === 'admin');
    
    if (isAdmin) {
        return true;
    }

    // Si no es admin, solo puede acceder a su propia data
    if (user.id !== targetUserId) {
        throw new ForbiddenException('You do not have permission to access or modify this user account');
    }

    return true;
  }
}
