import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AccountStatus, User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;
// Compared against when no account matches, so a login attempt for an unknown email
// takes as long as one for a known email with a wrong password (no timing side-channel
// for account enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.users.save(
      this.users.create({ email: dto.email, passwordHash, accountStatus: AccountStatus.ACTIVE }),
    );
  }

  // Same generic message for "no such account" and "wrong password" so the response
  // never tells a caller which part of the credentials was wrong.
  async validateCredentials(dto: LoginDto): Promise<User> {
    const user = await this.findByEmail(dto.email);
    const passwordMatches = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  signToken(user: User): string {
    return this.jwt.sign({ sub: user.id });
  }

  private findByEmail(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .where('lower(user.email) = lower(:email)', { email })
      .getOne();
  }
}
