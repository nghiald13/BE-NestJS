import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ProductsService } from '../../../product-service/src/modules/products/products.service';
import { UsersService } from '../modules/users/users.service';
import { ProductsModule } from '../../../product-service/src/modules/products/products.module';

@Module({
  imports: [
    ProductsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService
  ],
})
export class AdminModule { }
