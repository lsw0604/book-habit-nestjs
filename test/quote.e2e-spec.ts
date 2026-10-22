import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface QuoteBody {
  id: number;
  myBookId: number;
  readingLogId: number | null;
  readingLogDate: string | null;
  page: number;
  content: string;
}

// Quote가 ReadingLog에서 분리된 뒤의 실제 동작을 확인한다. 단위 테스트의 mock Prisma로는
// 확인할 수 없는 것들: 독서 기록 삭제 시 인용이 남고 연결만 풀리는지(SET NULL),
// 다른 책의 기록 연결을 막는지, 남의 책 인용 목록이 404인지.
// 책 담기는 외부 API(Kakao)를 타므로 Book/MyBook은 Prisma로 직접 만든다.
describe('Quote (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const emails = [
    `e2e-quote-a-${stamp}@example.com`,
    `e2e-quote-b-${stamp}@example.com`,
  ];
  // 13자리 테스트 ISBN. 실제 책과 겹치지 않게 시각으로 만든다.
  const isbns = [
    `9${String(stamp).slice(-12)}`,
    `8${String(stamp).slice(-12)}`,
  ];

  let cookieA: string;
  let cookieB: string;
  let myBookId: number;
  let otherMyBookId: number;
  let readingLogId: number;
  let otherReadingLogId: number;

  async function signup(
    email: string,
  ): Promise<{ cookie: string; userId: number }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password: 'password1234', name: 'e2e 인용' })
      .expect(201);
    const setCookie = res.get('Set-Cookie') as unknown as string[];
    const access = setCookie.find((c) => c.startsWith('access_token='));
    if (!access) throw new Error('access_token 쿠키가 없습니다.');
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return { cookie: access.split(';')[0], userId: user.id };
  }

  async function createReadingLog(cookie: string, forMyBookId: number) {
    const res = await request(app.getHttpServer())
      .post('/api/reading-log')
      .set('Cookie', cookie)
      .send({
        myBookId: forMyBookId,
        startPage: 1,
        endPage: 20,
        startTime: '2026-10-03T10:00:00.000Z',
        endTime: '2026-10-03T10:30:00.000Z',
        date: '2026-10-03',
      })
      .expect(201);
    return (res.body as { data: { id: number } }).data.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const a = await signup(emails[0]);
    const b = await signup(emails[1]);
    cookieA = a.cookie;
    cookieB = b.cookie;

    const [book, otherBook] = await Promise.all(
      isbns.map((isbn) =>
        prisma.book.create({
          data: { isbn, title: `e2e 인용 ${isbn}`, totalPage: 300 },
        }),
      ),
    );
    myBookId = (
      await prisma.myBook.create({
        data: { userId: a.userId, bookId: book.id },
      })
    ).id;
    otherMyBookId = (
      await prisma.myBook.create({
        data: { userId: a.userId, bookId: otherBook.id },
      })
    ).id;

    readingLogId = await createReadingLog(cookieA, myBookId);
    otherReadingLogId = await createReadingLog(cookieA, otherMyBookId);
  });

  afterAll(async () => {
    // User 삭제가 MyBook -> ReadingLog/Quote까지 cascade한다. Book은 따로 지운다.
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.book.deleteMany({ where: { isbn: { in: isbns } } });
    await app.close();
  });

  function post(body: Record<string, unknown>, cookie = cookieA) {
    return request(app.getHttpServer())
      .post('/api/quote')
      .set('Cookie', cookie)
      .send(body);
  }

  function list(query: string, cookie = cookieA) {
    return request(app.getHttpServer())
      .get(`/api/quote${query}`)
      .set('Cookie', cookie);
  }

  let linkedQuoteId: number;

  it('독서 기록 없이 책에 바로 인용을 남길 수 있다', async () => {
    const res = await post({ myBookId, page: 50, content: '연결 없음' }).expect(
      201,
    );

    expect((res.body as { data: QuoteBody }).data).toMatchObject({
      myBookId,
      readingLogId: null,
      readingLogDate: null,
      page: 50,
    });
  });

  it('같은 책의 독서 기록에 연결하면 기록 날짜가 함께 나온다', async () => {
    const res = await post({
      myBookId,
      readingLogId,
      page: 10,
      content: '연결됨',
    }).expect(201);

    const quote = (res.body as { data: QuoteBody }).data;
    expect(quote).toMatchObject({ readingLogId, readingLogDate: '2026-10-03' });
    linkedQuoteId = quote.id;
  });

  it('다른 책의 독서 기록에는 연결할 수 없다(404)', async () => {
    await post({
      myBookId,
      readingLogId: otherReadingLogId,
      page: 10,
      content: '다른 책 기록',
    }).expect(404);
  });

  it('총 페이지 수를 넘는 페이지는 400이다', async () => {
    await post({ myBookId, page: 301, content: '범위 밖' }).expect(400);
  });

  it('남의 책에는 인용을 남길 수 없다(404)', async () => {
    await post({ myBookId, page: 1, content: '남의 책' }, cookieB).expect(404);
  });

  it('책 단위 목록은 페이지순이고, readingLogId로 좁힐 수 있다', async () => {
    const all = await list(`?myBookId=${myBookId}`).expect(200);
    expect(
      (all.body as { data: QuoteBody[] }).data.map((q) => q.content),
    ).toEqual(['연결됨', '연결 없음']);

    const narrowed = await list(
      `?myBookId=${myBookId}&readingLogId=${readingLogId}`,
    ).expect(200);
    expect(
      (narrowed.body as { data: QuoteBody[] }).data.map((q) => q.content),
    ).toEqual(['연결됨']);
  });

  it('myBookId 없이 목록을 조회하면 400, 남의 책 목록은 404다', async () => {
    await list('').expect(400);
    await list(`?myBookId=${myBookId}`, cookieB).expect(404);
  });

  it('readingLogId: null로 수정하면 연결이 풀리고, 다시 연결할 수 있다', async () => {
    const unlinked = await request(app.getHttpServer())
      .patch(`/api/quote/${linkedQuoteId}`)
      .set('Cookie', cookieA)
      .send({ readingLogId: null })
      .expect(200);
    expect((unlinked.body as { data: QuoteBody }).data.readingLogId).toBeNull();

    const relinked = await request(app.getHttpServer())
      .patch(`/api/quote/${linkedQuoteId}`)
      .set('Cookie', cookieA)
      .send({ readingLogId })
      .expect(200);
    expect((relinked.body as { data: QuoteBody }).data.readingLogId).toBe(
      readingLogId,
    );
  });

  it('독서 기록을 지워도 인용은 남고 연결만 풀린다', async () => {
    await request(app.getHttpServer())
      .delete(`/api/reading-log/${readingLogId}`)
      .set('Cookie', cookieA)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/quote/${linkedQuoteId}`)
      .set('Cookie', cookieA)
      .expect(200);
    expect((res.body as { data: QuoteBody }).data).toMatchObject({
      content: '연결됨',
      readingLogId: null,
      readingLogDate: null,
    });
  });
});
