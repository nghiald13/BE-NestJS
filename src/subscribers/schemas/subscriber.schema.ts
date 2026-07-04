import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@Schema()
export class Subscriber {

    @Prop()
    name: string

    @Prop()
    email: string

    @Prop()
    phone: string

    @Prop()
    description: string
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber)
