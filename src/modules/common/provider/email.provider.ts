import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: user && pass ? { user, pass } : undefined
            });
        }
    }

    public async sendWelcomeEmail(to: string, loginLink: string, fullname: string, defaultPassword: string) {
        if (!to) {
            console.warn('EmailService.sendWelcomeEmail called without recipient (to is empty) - skipping SMTP send.');
            return;
        }
        const from = process.env.EMAIL_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`;
        const subject = 'Bem-vindo ao Sistema Videira Caruaru';
        const html = `Olá ${fullname},<br/><br/>Seu acesso ao sistema foi ativado!<br/><br/>
        <strong>Email:</strong> ${to}<br/>
        <strong>Senha temporária:</strong> ${defaultPassword}<br/><br/>
        Por favor, altere sua senha no primeiro acesso.<br/><br/>
        <a href="${loginLink}">Acessar o sistema</a><br/><br/>
        Caso não tenha solicitado, entre em contato com o administrador.`;

        if (!this.transporter) {
            console.log(`Welcome email to ${to}. Login: ${to}, Password: ${defaultPassword}, Link: ${loginLink}`);
            return;
        }

        try {
            await this.transporter.sendMail({ from, to, subject, html });
        } catch (err: unknown) {
            console.error('Failed to send welcome email, falling back to console. Error:', err);
            console.log(`Welcome email to ${to}. Login: ${to}, Password: ${defaultPassword}, Link: ${loginLink}`);
            return;
        }
    }
}

export default EmailService;
