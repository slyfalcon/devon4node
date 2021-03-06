import {
  Controller,
  Post,
  HttpStatus,
  Body,
  HttpException,
  Put,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiUseTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserVm } from './models/view-models/user-vm.model';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id';
import { RegisterVm } from './models/view-models/register-vm.model';
import { LoginResponseVm } from './models/view-models/login-response-vm.model';
import { LoginVm } from './models/view-models/login-vm.model';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/role.decorator';
import { UserRole } from './models/user-role.enum';
import { ChangePasswordVm } from './models/view-models/change-password-vm.model';

@Controller('users')
@ApiUseTags('User')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Post('register')
  @ApiResponse({ status: HttpStatus.CREATED, type: UserVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'Register'))
  async register(@Body() registerVm: RegisterVm): Promise<UserVm> {
    try {
      registerVm = this.validateRegister(registerVm);
      const newUser = await this._userService.register(registerVm);
      const { id, password, ...result } = newUser;
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponseVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'Login'))
  async login(@Body() loginVm: LoginVm): Promise<LoginResponseVm> {
    try {
      const fields = Object.keys(loginVm);
      fields.forEach(field => {
        if (!loginVm[field]) {
          throw new HttpException(
            `${field} is required`,
            HttpStatus.BAD_REQUEST,
          );
        }
      });
      return await this._userService.login(loginVm);
    } catch (error) {
      throw error;
    }
  }

  @Put('update')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.Admin, UserRole.User)
  @ApiResponse({ status: HttpStatus.CREATED, type: UserVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'Update'))
  async update(@Body() vm: UserVm): Promise<UserVm> {
    try {
      if (!vm || !vm.id) {
        throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
      }
      const exist = await this._userService.findById(vm.id).catch(err => {
        throw new HttpException(err, HttpStatus.BAD_REQUEST);
      });

      if (!exist) {
        throw new HttpException(
          ` No user Found with this id: ${vm.id}`,
          HttpStatus.NOT_FOUND,
        );
      }
      if (vm.mail && vm.mail.trim() !== '') exist.mail = vm.mail;
      const updated = await this._userService
        .update(vm.id, exist)
        .catch(err => {
          throw new HttpException(err, HttpStatus.BAD_REQUEST);
        });
      if (updated) {
        const { id, ...result } = updated;
        return result as UserVm;
      } else {
        throw new HttpException(
          'The user could not be updated',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  @Put('upgrade/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.Admin)
  @ApiResponse({ status: HttpStatus.CREATED, type: UserVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'Upgrade'))
  async upgrade(@Param('id') identificator: number): Promise<UserVm> {
    try {
      if (!identificator) {
        throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
      }
      const exist = await this._userService.findById(identificator);

      if (!exist) {
        throw new HttpException(
          `No User found with the provided id: ${identificator}`,
          HttpStatus.NOT_FOUND,
        );
      }
      exist.role = UserRole.Admin;

      const updated = await this._userService.update(identificator, exist);
      if (updated) {
        const { id, ...result } = updated;
        return result;
      } else {
        throw new HttpException(
          'The user could not be upgraded',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  @Put('downgrade/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.Admin)
  @ApiResponse({ status: HttpStatus.CREATED, type: UserVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'Downgrade'))
  async downgrade(@Param('id') identificator: number): Promise<UserVm> {
    try {
      if (!identificator) {
        throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
      }
      const exist = await this._userService.findById(identificator);

      if (!exist) {
        throw new HttpException(
          `No User found with the provided id: ${identificator}`,
          HttpStatus.NOT_FOUND,
        );
      }
      exist.role = UserRole.User;

      const updated = await this._userService.update(identificator, exist);
      if (updated) {
        const { id, ...result } = updated;
        return result;
      } else {
        throw new HttpException(
          'The user could not be downgraded',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  @Put('change-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.Admin, UserRole.User)
  @ApiResponse({ status: HttpStatus.CREATED, type: UserVm })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiException })
  @ApiOperation(GetOperationId('User', 'ChangePassword'))
  async changePassword(@Body() user: ChangePasswordVm): Promise<UserVm> {
    try {
      const { username, newPassword } = user;

      if (!username || !user.password || !newPassword) {
        throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
      }
      const result = await this._userService.changePassword(user);
      if (!result)
        throw new HttpException(
          'An unexpected error has ocurred',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      const { id, password, ...resultVm } = result;
      return resultVm;
    } catch (error) {
      throw error;
    }
  }

  validateRegister(register: RegisterVm): RegisterVm {
    const { username, password, mail } = register;
    if (!username) {
      throw new HttpException('username is required', HttpStatus.BAD_REQUEST);
    }
    if (!password) {
      throw new HttpException('password is required', HttpStatus.BAD_REQUEST);
    }
    if (!mail) {
      throw new HttpException('mail is required', HttpStatus.BAD_REQUEST);
    }
    register.role = 'User';
    register.username = username.toLowerCase();
    register.mail = mail.toLowerCase();
    return register;
  }
}
