import { Body, Controller, Get, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthService } from './auth.service';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RefreshSchema = z.object({
  userId: z.string().uuid(),
  refreshToken: z.string().min(10),
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'CLEANER', 'GUEST']),
  phone: z.string().optional(),
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

  @Post('users')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async createUser(@Body() body: { email: string; password: string; name: string; role: string; phone?: string }) {
    return this.auth.createUser(body);
  }

  @Get('users')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async getUsers() {
    return this.auth.getUsers();
  }
}
