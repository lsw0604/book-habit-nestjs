import type { ApiPropertyOptions } from '@nestjs/swagger';

// 책 표지 필드의 Swagger 설명. 응답마다 설명이 달라지지 않도록 여기서만 정의한다.
// 크기는 2026-09-30 카카오 이미지를 실제로 받아 확인한 값이다.

/** 작은 표지. 카카오 리사이즈 이미지라 크기가 사실상 고정이다. */
export const BookThumbnailApiProperty: ApiPropertyOptions = {
  description:
    '작은 표지 이미지 URL (최대 120×174). 목록, 한줄평, 독서 기록처럼 작은 표지를 보여 주는 곳에 쓴다.',
  type: String,
  nullable: true,
};

/**
 * 큰 표지. 원본이라 책마다 크기가 다르다(확인한 예: 458×671, 454×687) - 정확한 크기를
 * 알려면 이미지를 직접 받아야 해서 응답에 넣지 않는다. 클라이언트는 비율 컨테이너로
 * 자리를 잡고 object-fit으로 채운다.
 */
export const BookCoverImageApiProperty: ApiPropertyOptions = {
  description:
    '큰 표지 이미지 URL (원본, 가로 약 450px 전후로 책마다 다름). 도서 상세처럼 큰 표지를 보여 주는 곳에 쓴다. 크기가 고정이 아니므로 책 비율(약 2:3) 컨테이너 안에서 object-fit으로 채워 쓴다.',
  type: String,
  nullable: true,
};
