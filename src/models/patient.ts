import { Schema, model } from 'mongoose';

export interface IPatient {
  id: number;
  name?: string;
  birth_date?: Date;
  time_slot: string;
}
const patientSchema = new Schema<IPatient>({
  id: { type: Number, unique: true, index: true },
  name: String,
  birth_date: Date,
  time_slot: { type: String, required: true }
})
export default model("Patient", patientSchema);
