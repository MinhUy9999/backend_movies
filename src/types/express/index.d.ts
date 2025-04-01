import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | { 
        id?: string;
        userId?: string;
        username?: string; 
        email?: string; 
        role?: string;
        [key: string]: any;
      };
    }
  }
}