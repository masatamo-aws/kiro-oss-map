/**
 * Express型定義拡張
 */

import { JwtPayload } from '../../../shared/types/common';
import { Logger } from '../../../shared/utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      logger?: Logger;
    }
  }
}

export {};