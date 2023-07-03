import { Schema, model } from 'mongoose';

export interface IPatient {
  id: number;
  name?: string;
  birth_date?: Date;
  start_attend_time: number;
  end_attend_time: number;
}
const patientSchema = new Schema<IPatient>({
  id: { type: Number, unique: true, index: true },
  name: String,
  birth_date: Date,
  start_attend_time: { type: Number, required: true },
  end_attend_time: { type: Number, required: true }
})
export default model("Patient", patientSchema);
