import { Schema, model } from 'mongoose';

export interface IDoctor {
  id: number;
  name?: string;
  birth_date?: Date;
  start_reception_time: number;
  end_reception_time: number;
}
const doctorSchema = new Schema<IDoctor>({
  id: { type: Number, required: true, unique: true, index: true },
  name: String,
  birth_date: Date,
  start_reception_time: { type: Number, required: true },
  end_reception_time: { type: Number, required: true }
})

export default model("Doctor", doctorSchema);
