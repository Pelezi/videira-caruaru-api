import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { AuthenticatedRequest } from '../types/authenticated-request.interface';
import { extractTokenPayload } from './security-utils';

@Injectable()
export class RestrictedGuard implements CanActivate {

    public canActivate(context: ExecutionContext): boolean {

        const request = context.switchToHttp().getRequest<FastifyRequest>() as AuthenticatedRequest;
        const payload = extractTokenPayload(request);
        if (!payload) {
            return false;
        }

        // Attach user info to request for use in controllers
        request.member = {
            id: payload.userId,
            matrixId: payload.matrixId
        };

        return true;
    }

}
