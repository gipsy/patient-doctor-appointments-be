import { Schema, model } from 'mongoose';

export interface IAppointment {
  doctor_id: number;
  patient_id: number;
  start_appointment_time?: number | string;
}

export interface ISuggestedAppointment extends IAppointment {
  _id: string
}

const appointmentSchema = new Schema<IAppointment>({
  doctor_id: { type: Number, required: true },
  patient_id: { type: Number, required: true },
  start_appointment_time: String
})
export default model("Appointment", appointmentSchema);
