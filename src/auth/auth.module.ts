import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from './strategies';
import { KakaoOAuthService } from './providers';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule, PassportModule, JwtModule.register({}), HttpModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenStrategy, KakaoOAuthService],
})
export class AuthModule {}
