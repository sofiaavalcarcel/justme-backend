import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.roles?.length) {
            throw new ForbiddenException('No roles assigned');
        }

        const userRoleNames = user.roles.map((role: any) =>
            typeof role === 'string' ? role : role.name,
        );

        const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));

        if (!hasRole) {
            throw new ForbiddenException(
                `Required roles: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}
