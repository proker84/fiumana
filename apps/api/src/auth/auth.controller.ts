import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RefreshSchema = z.object({
  userId: z.string().uuid(),
  refreshToken: z.string().min(10),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() body: z.infer<typeof LoginSchema>) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  async refresh(@Body() body: z.infer<typeof RefreshSchema>) {
    return this.auth.refresh(body.userId, body.refreshToken);
  }
}
