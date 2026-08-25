import { Prisma } from '@prisma/client';

/**
 * 목록 조회용 select. reviewLike는 요청자(userId)가 좋아요를 눌렀는지만
 * 확인하기 위한 필터라 select 시점에 요청자 userId가 필요하다 (isLiked 계산용).
 * userId가 없으면(비로그인) 절대 매치되지 않는 0을 넣어 항상 빈 배열(= isLiked: false)이 되게 한다
 * (id는 autoincrement라 1부터 시작하므로 0은 안전한 sentinel).
 */
export const buildPublicReviewListSelect = (userId: number | undefined) =>
  ({
    id: true,
    review: true,
    createdAt: true,
    // MyBookReview.isPublic은 "이 책에 대한 내 감상을 공개한다"는 의미이고,
    // 그 감상에는 한줄평뿐 아니라 평점도 포함된다 - 그래서 rating은 함께 노출한다.
    // 반면 진도(currentPage)/독서 로그/인용구는 감상이 아니라 개인 기록이므로
    // 이 플래그로 공개되지 않는다. myBook에서 필요한 필드만 골라 담을 것.
    myBook: {
      select: {
        rating: true,
        user: { select: { id: true, name: true, profile: true } },
      },
    },
    _count: { select: { reviewLike: true, reviewComment: true } },
    reviewLike: {
      where: { userId: userId ?? 0 },
      select: { id: true },
      take: 1,
    },
  }) satisfies Prisma.MyBookReviewSelect;
