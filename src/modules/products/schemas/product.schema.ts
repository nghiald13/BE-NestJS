import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>

@Schema({ timestamps: true, })
export class Product extends Document {
    @Prop()
    name: string

    @Prop()
    manufacturer: string

    @Prop()
    price: number

    @Prop()
    in_stock: number

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    description: string

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    spec: any
}


export const ProductSchema = SchemaFactory.createForClass(Product)