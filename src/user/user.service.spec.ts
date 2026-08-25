import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  callData,
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prismaService: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  const bcryptHash = bcrypt.hash as unknown as jest.Mock;

  beforeEach(async () => {
    prismaService = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    bcryptHash.mockReset();
    bcryptHash.mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(UserService);
  });

  describe('create', () => {
    it('카카오 합성 이메일 도메인이면 BadRequestException을 던지고 생성하지 않는다', async () => {
      await expect(
        service.create({
          email: 'attacker@oauth.kakao.com',
          password: 'password1234',
          name: '공격자',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(bcryptHash).not.toHaveBeenCalled();
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('비밀번호를 해시해서 생성한다', async () => {
      prismaService.user.create.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        name: '홍길동',
      });

      await service.create({
        email: 'a@a.com',
        password: 'password1234',
        name: '홍길동',
      });

      expect(bcryptHash).toHaveBeenCalledWith('password1234', 10);
      const data = callData<{ password: string }>(prismaService.user.create);
      expect(data.password).toBe('hashed-password');
      const omitArg = firstCallArg(prismaService.user.create) as {
        omit: { password: boolean };
      };
      expect(omitArg.omit).toEqual({ password: true });
    });

    it('이미 가입된 이메일이면(P2002) ConflictException을 던진다', async () => {
      prismaService.user.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['email'] }),
      );

      await expect(
        service.create({
          email: 'a@a.com',
          password: 'password1234',
          name: '홍길동',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createOAuthUser', () => {
    it('비밀번호 해시 없이 생성한다', async () => {
      prismaService.user.create.mockResolvedValue({ id: 1 });

      await service.createOAuthUser({
        email: 'kakao@example.com',
        name: '카카오유저',
        provider: Provider.KAKAO,
      });

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(callData(prismaService.user.create)).toEqual({
        email: 'kakao@example.com',
        name: '카카오유저',
        provider: Provider.KAKAO,
      });
    });

    it('이미 가입된 이메일이면(P2002) ConflictException을 던진다', async () => {
      prismaService.user.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['email'] }),
      );

      await expect(
        service.createOAuthUser({
          email: 'a@a.com',
          name: '홍길동',
          provider: Provider.KAKAO,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('존재하지 않으면 NotFoundException을 던진다', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('대상이 없으면 NotFoundException을 던진다', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: '수정' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('카카오 합성 이메일 도메인으로 수정하려 하면 BadRequestException을 던진다', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.update(1, { email: 'x@oauth.kakao.com' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('password가 있으면 새로 해시해서 수정한다', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      prismaService.user.update.mockResolvedValue({ id: 1 });

      await service.update(1, { password: 'newpassword1234' });

      expect(bcryptHash).toHaveBeenCalledWith('newpassword1234', 10);
      const data = callData<{ password: string }>(prismaService.user.update);
      expect(data.password).toBe('hashed-password');
    });

    it('password가 없으면 해시 없이 dto를 그대로 사용한다', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      prismaService.user.update.mockResolvedValue({ id: 1 });

      await service.update(1, { name: '수정된 이름' });

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(callData(prismaService.user.update)).toEqual({
        name: '수정된 이름',
      });
    });

    it('이메일을 다른 유저가 이미 쓰고 있으면(P2002) ConflictException을 던진다', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      prismaService.user.update.mockRejectedValue(
        createPrismaError('P2002', { target: ['email'] }),
      );

      await expect(service.update(1, { email: 'taken@a.com' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('대상이 없으면 NotFoundException을 던지고 delete를 호출하지 않는다', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });

    it('존재하면 삭제한다', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      prismaService.user.delete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        omit: { password: true },
      });
    });
  });
});
