import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const PASSWORD_SALT_ROUNDS = 10;

export type CreateOAuthUserInput = {
  email: string;
  name: string;
  provider: Provider;
  profile?: string;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      PASSWORD_SALT_ROUNDS,
    );

    try {
      return await this.prisma.user.create({
        data: { ...createUserDto, password: hashedPassword },
        omit: { password: true },
      });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  // 소셜 로그인(OAuth)으로 새로 만드는 유저용. password 없이 가입하는 경로라
  // bcrypt.hash를 거치지 않음 - create()는 로컬 회원가입 전용으로 password가 필수임.
  // findByEmail()과 마찬가지로 AuthService 내부용이라 password를 omit하지 않음
  // (반환값을 그대로 컨트롤러 응답으로 내보내면 안 됨).
  async createOAuthUser(input: CreateOAuthUserInput) {
    try {
      return await this.prisma.user.create({ data: input });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  findAll() {
    return this.prisma.user.findMany({ omit: { password: true } });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });

    if (!user) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }

    return user;
  }

  // 로그인 검증(비밀번호 해시 비교)을 위해 password를 포함해서 조회함.
  // AuthService 내부용이며 이 메서드의 반환값을 그대로 컨트롤러 응답으로 내보내면 안 됨.
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data = updateUserDto.password
      ? {
          ...updateUserDto,
          password: await bcrypt.hash(
            updateUserDto.password,
            PASSWORD_SALT_ROUNDS,
          ),
        }
      : updateUserDto;

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        omit: { password: true },
      });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      omit: { password: true },
    });
  }

  private mapUniqueConstraintError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('이미 가입된 이메일입니다.');
    }

    return error;
  }
}
