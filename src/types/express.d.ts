// loggingMiddleware(src/common/logging/logging.middleware.ts)가 요청마다
// 부여하는 correlation id. 접근 로그와 ResponseExceptionFilter의 에러
// 스택트레이스 로그를 같은 요청으로 연결해서 추적하기 위함.
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export {};
