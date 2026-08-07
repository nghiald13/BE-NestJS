import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../roles.enum';
import { ROLES_KEY } from '../../../../../nest-app/src/decorators/decor';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Lấy ra các roles yêu cầu được gắn trên Controller hoặc Method hiện tại
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        // Lấy thông tin user từ request (được nạp từ JwtAuthGuard trước đó)
        const { user } = context.switchToHttp().getRequest();

        // Nếu không có user hoặc user không có trường role, chặn lại luôn
        if (!user || !user.role) {
            throw new ForbiddenException('Bạn không có quyền truy cập API này');
        }

        // Kiểm tra xem role của user có nằm trong danh sách các roles yêu cầu không
        const hasPermission = requiredRoles.some((role) => user.role === role);

        if (!hasPermission) {
            throw new ForbiddenException('Bạn không đủ thẩm quyền để thực hiện hành động này');
        }

        return true;
    }
}