import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/provider/prisma.provider';

@Injectable()
export class ExternalService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Checks if a member with the given phone number exists
     * @param phone - Phone number (must contain only digits, can include country code)
     */
    public async checkPhoneExists(phone: string): Promise<boolean> {
        if (!phone) {
            return false;
        }

        // Sanitize phone: remove all non-digit characters
        const sanitizedPhone = phone.replace(/\D/g, '');

        // Validate that we have only digits
        if (!sanitizedPhone || !/^\d+$/.test(sanitizedPhone)) {
            return false;
        }

        // For Brazilian numbers (starting with 55), check both with and without the 9
        if (sanitizedPhone.startsWith('55')) {
            // Format: 55 + DDD (2) + number (8 or 9 digits) = 12 or 13 total
            const phoneWith9 = sanitizedPhone.length === 12
                ? sanitizedPhone.slice(0, 4) + '9' + sanitizedPhone.slice(4)
                : sanitizedPhone;
            const phoneWithout9 = sanitizedPhone.length === 13 && sanitizedPhone[4] === '9'
                ? sanitizedPhone.slice(0, 4) + sanitizedPhone.slice(5)
                : sanitizedPhone;

            const member = await this.prisma.member.findFirst({
                where: { phone: { in: [phoneWith9, phoneWithout9] } },
                select: { id: true }
            });

            return member !== null;
        }

        // For other countries, just check exact match
        const member = await this.prisma.member.findFirst({
            where: { phone: sanitizedPhone },
            select: { id: true }
        });

        return member !== null;
    }
}
