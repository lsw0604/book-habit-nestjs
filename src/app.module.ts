import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseDtoInterceptor, ResponseExceptionFilter } from './common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BooksModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseDtoInterceptor },
    { provide: APP_FILTER, useClass: ResponseExceptionFilter },
    AppService,
  ],
})
export class AppModule {}
