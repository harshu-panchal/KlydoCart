import mongoose, { Schema, Document } from 'mongoose';

export interface IHeaderCategory extends Document {
    name: string;
    iconLibrary: string;
    iconName: string;
    slug: string;
    image?: string; // Optional custom image
    relatedCategory?: string; // Links to a product category
    order: number;
    status: 'Published' | 'Unpublished';
    showInHome?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HeaderCategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        iconLibrary: { type: String, required: true },
        iconName: { type: String, required: true },
        image: { type: String, required: false },
        slug: { type: String, required: true, unique: true },
        relatedCategory: { type: String, required: false },
        order: { type: Number, default: 0 },
        status: { type: String, enum: ['Published', 'Unpublished'], default: 'Published' },
        showInHome: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<IHeaderCategory>('HeaderCategory', HeaderCategorySchema);
