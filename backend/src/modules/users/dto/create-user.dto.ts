import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe' })
  @IsString() @IsNotEmpty()
  loginId: string;

  @ApiProperty({ example: 'john@gsv.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'John' })
  @IsOptional() @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional() @IsString()
  lastName?: string;

  @ApiProperty({ example: 'TempPass@123', minLength: 8 })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  designation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  roleId?: string;

  @ApiProperty({ enum: ['male', 'female', 'other', 'not_specified'], required: false })
  @IsOptional() @IsEnum(['male', 'female', 'other', 'not_specified'])
  gender?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8)
  newPassword: string;
}
