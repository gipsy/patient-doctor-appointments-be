import { Schema, model } from 'mongoose';

export interface IDoctor {
  id: number;
  name?: string;
  birth_date?: string;
  time_slot: string;
}
const doctorSchema = new Schema<IDoctor>({
  id: { type: Number, required: true, unique: true, index: true },
  name: String,
  birth_date: String,
  time_slot: { type: String, required: true }
})

export default model("Doctor", doctorSchema);
