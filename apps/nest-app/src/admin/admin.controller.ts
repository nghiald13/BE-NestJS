import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BulkProductDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { RolesGuard } from '../../../auth-service/modules/auth/passport/roles-auth.guard';
import { Roles } from '../../../api-gateway/src/decorators/decor';
import { Role } from '../../../auth-service/modules/auth/roles.enum';

@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.adminService.create(createAdminDto);
  // }

  // @Get()
  // findAll() {
  //   return this.adminService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.adminService.remove(+id);
  // }


  @Get('/products/statistics')
  @Roles(Role.ADMIN)
  async getProductStatistics() {
    return this.adminService.getProductsStatistics()
  }

  @Post(`/products/bulk`)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addBulkProduct(@Body() bulkProductDto: BulkProductDto) {
    return this.adminService.addBulkProduct(bulkProductDto);
  }
}
