import { PartialType } from '@nestjs/mapped-types';
import { SignInAuthDto } from './signIn-auth.dto';

export class UpdateAuthDto extends PartialType(SignInAuthDto) {}
