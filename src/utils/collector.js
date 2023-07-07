const collector = ({appointments, patients, doctors}) => {
  let suggestedAppointments = [];
  const validateAppointments = appointments.map((appointment,idx) => {
    const relatedPatientAppointments = appointments.filter(item => item.patient_id === appointment.patient_id);
    const relatedDoctorAppointments = appointments.filter(item => item.doctor_id === appointment.doctor_id);

    const relatedPatientTimeSlot = patients.find(patient => patient.id === appointment.patient_id).time_slot;
    const relatedDoctorTimeSlot = doctors.find(doctor => doctor.id === appointment.doctor_id).time_slot;

    const overlapSlot =
      Math.max(
        Number(relatedPatientTimeSlot.split('-')[0]),
        Number(relatedDoctorTimeSlot.split('-')[0])
      ) <=
      Math.min(
        Number(relatedPatientTimeSlot.split('-')[1]),
        Number(relatedDoctorTimeSlot.split('-')[1])
      ) && [
      Math.max(
        Number(relatedPatientTimeSlot.split('-')[0]),
        Number(relatedDoctorTimeSlot.split('-')[0])
      ),
      Math.min(
        Number(relatedPatientTimeSlot.split('-')[1]),
        Number(relatedDoctorTimeSlot.split('-')[1])
      )
    ].sort();

    const fits = overlapSlot[0] <= appointment.start_appointment_time
      && appointment.start_appointment_time < overlapSlot[1]

    const conflictedAppointments = [...new Set([
      ...relatedPatientAppointments.filter(item => item.start_appointment_time === appointment.start_appointment_time),
      ...relatedDoctorAppointments.filter(item => item.start_appointment_time === appointment.start_appointment_time)
    ])];

    const suggestedAppointmentTime = () => {
      const relatedSuggestedPatientStartTime = suggestedAppointments
        .find( item => item.patient_id === appointment.patient_id )?.start_appointment_time;
      const relatedSuggestedDoctorStartTime = suggestedAppointments
        .find(item => item.doctor_id === appointment.doctor_id)?.start_appointment_time;

      const availableHours = overlapSlot && Array(
        overlapSlot[1] - overlapSlot[0]
      ).fill().map((_, idx) => overlapSlot[0] + idx)
      .filter(hr => hr !== relatedSuggestedPatientStartTime && hr !== relatedSuggestedDoctorStartTime)[0]
      return availableHours
    }
    suggestedAppointments.push({
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: suggestedAppointmentTime() || appointment.start_appointment_time,
      inapt: !overlapSlot,
      suggested: appointments[idx].start_appointment_time !== suggestedAppointmentTime()
    });

    return {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      inapt: !fits,
      conflicts: conflictedAppointments.length > 1
    }
  });

  return {
    requestedAppointments: validateAppointments,
    suggestedAppointments: suggestedAppointments
  }
}

module.exports = collector;
