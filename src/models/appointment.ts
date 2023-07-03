import { Schema, model } from 'mongoose';

export interface IAppointment {
  doctor_id: number;
  patient_id: number;
  start_appointment_time?: number;
}
const appointmentSchema = new Schema<IAppointment>({
  doctor_id: { type: Number, required: true },
  patient_id: { type: Number, required: true },
  start_appointment_time: Number
})
export default model("Appointment", appointmentSchema);
