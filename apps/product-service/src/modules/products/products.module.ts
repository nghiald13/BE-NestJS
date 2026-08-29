import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { Microservice } from 'libs/enum/microservice.enum';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    ClientsModule.registerAsync([{
      name: Microservice.KAFKA_SERVICE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const brokers = configService.get<string>('KAFKA_BROKERS');

        return {
          options: {
            client: {
              clientId: 'product-service-client',
              brokers: brokers
            },
            consumer: {
              groupId: 'product-client-consumer',
            }
          }
        }
      }
    }]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [
    MongooseModule,
    ProductsService]
})
export class ProductsModule { }
