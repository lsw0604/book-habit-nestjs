import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_METADATA_KEY } from './response.constants';

export const ResponseMessage = (message: string): CustomDecorator =>
  SetMetadata(RESPONSE_MESSAGE_METADATA_KEY, { message });
