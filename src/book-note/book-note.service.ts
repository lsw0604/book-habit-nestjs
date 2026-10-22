import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BookNote,
  BookNoteSection,
  BookNoteTemplate,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import {
  BOOK_NOTE_TEMPLATES,
  type BookNoteTemplateDef,
} from './book-note.templates';
import {
  partitionBookNoteSections,
  toBookNoteSections,
} from './book-note-sections.util';
import { UpsertBookNoteDto } from './dto/upsert-book-note.dto';
import type {
  BookNoteResponseDto,
  BookNoteTemplateResponseDto,
} from './dto/book-note-response.dto';

/**
 * 책 한 권 단위 개인 노트. MyBook당 하나라 경로 식별자로 myBookId를 쓴다
 * (MyBook의 by-isbn처럼 상위 리소스 식별자로 유일한 자식을 찾는다).
 *
 * 소유권은 MyBook을 통해서만 확인한다. 조회는 where에 `myBook: { userId }`를 걸어
 * 남의 것이면 null을 돌려주고, 쓰기는 MyBookService.assertOwnership으로 먼저 확인한다.
 */
@Injectable()
export class BookNoteService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookService: MyBookService,
  ) {}

  findTemplates(): BookNoteTemplateResponseDto[] {
    // 객체 키 순서(= BOOK_NOTE_TEMPLATES 선언 순서)가 화면의 템플릿 카드 순서다.
    return (Object.keys(BOOK_NOTE_TEMPLATES) as BookNoteTemplate[]).map(
      (template) => {
        const def: BookNoteTemplateDef = BOOK_NOTE_TEMPLATES[template];
        return {
          template,
          name: def.name,
          description: def.description,
          recommended: def.recommended,
          sections: def.sections.map((section) => ({ ...section })),
        };
      },
    );
  }

  /** 노트가 없거나 남의 서재 항목이면 null (404가 아니다 - by-my-book 관례). */
  async findByMyBookId(
    userId: number,
    myBookId: number,
  ): Promise<BookNoteResponseDto | null> {
    const note = await this.prismaService.bookNote.findFirst({
      where: { myBookId, myBook: { userId } },
      include: { sections: true },
    });

    return note ? this.toResponse(note) : null;
  }

  /**
   * 노트를 만들거나 바꾼다. 보낸 섹션만 바뀌고 보내지 않은 섹션은 그대로 둔다.
   * 템플릿이 바뀌면 이전 템플릿의 섹션 행을 모두 지운다(다른 템플릿의 key가 남지 않게).
   * 여러 쿼리라 트랜잭션 하나로 묶는다 - 중간에 실패하면 노트가 반쯤 바뀐 채 남는다.
   */
  async upsert(
    userId: number,
    myBookId: number,
    { template, sections }: UpsertBookNoteDto,
  ): Promise<BookNoteResponseDto> {
    await this.myBookService.assertOwnership(userId, myBookId);
    // 트랜잭션 전에 검증해 400이 DB 작업 없이 나가게 한다.
    const { filled, emptyKeys } = partitionBookNoteSections(template, sections);

    return this.prismaService.$transaction(async (tx) => {
      const previous = await tx.bookNote.findUnique({
        where: { myBookId },
        select: { template: true },
      });

      const note = await tx.bookNote.upsert({
        where: { myBookId },
        create: { myBookId, template },
        update: { template },
        select: { id: true },
      });

      if (previous && previous.template !== template) {
        await tx.bookNoteSection.deleteMany({
          where: { bookNoteId: note.id },
        });
      }

      if (emptyKeys.length > 0) {
        await tx.bookNoteSection.deleteMany({
          where: { bookNoteId: note.id, key: { in: emptyKeys } },
        });
      }

      for (const { key, content } of filled) {
        await tx.bookNoteSection.upsert({
          where: { bookNoteId_key: { bookNoteId: note.id, key } },
          create: { bookNoteId: note.id, key, content },
          update: { content },
        });
      }

      const saved = await tx.bookNote.findUniqueOrThrow({
        where: { id: note.id },
        include: { sections: true },
      });

      return this.toResponse(saved);
    });
  }

  async remove(userId: number, myBookId: number): Promise<void> {
    // 섹션은 DB의 ON DELETE CASCADE로 함께 지워진다.
    const { count } = await this.prismaService.bookNote.deleteMany({
      where: { myBookId, myBook: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException('독서 노트를 찾을 수 없습니다.');
    }
  }

  private toResponse(
    note: BookNote & { sections: BookNoteSection[] },
  ): BookNoteResponseDto {
    return {
      myBookId: note.myBookId,
      template: note.template,
      sections: toBookNoteSections(note.template, note.sections),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
