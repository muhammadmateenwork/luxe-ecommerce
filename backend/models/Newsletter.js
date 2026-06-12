import mongoose, { Schema } from 'mongoose';

const NewsletterSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
}, { timestamps: true });

const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);
export default Newsletter;
