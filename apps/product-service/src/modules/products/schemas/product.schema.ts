import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>

export class SpecificationItem {
    @Prop({ required: true })
    key: string;

    @Prop({ required: true })
    value: string;
}

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

    @Prop({ default: ''})
    image: string

    @Prop({
        type: [{key: String, value: String}],
        default: [],
        _id: false
    })
    specification: SpecificationItem[];

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    description: Record<string, any>;

    @Prop()
    status: string
}


export const ProductSchema = SchemaFactory.createForClass(Product)