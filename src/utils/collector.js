const collector = ({appointments, patients, doctors}) => {

  let suggestedAppointments = [];

  const validateAppointments = appointments.map((appointment) => {

    const appointmentsOfRelatedPatient = appointments.filter(item => item.patient_id === appointment.patient_id);
    const appointmentsOfRelatedDoctor = appointments.filter(item => item.doctor_id === appointment.doctor_id);

    const timeSlotOfRelatedPatient = patients.find(patient => patient.id === appointment.patient_id).time_slot;
    const timeSlotOfRelatedDoctor = doctors.find(doctor => doctor.id === appointment.doctor_id).time_slot;

    const suggestedStartTimesOfRelatedPatient =
      suggestedAppointments.filter( item => item.patient_id === appointment.patient_id )
      .map(item => item.start_appointment_time).filter(res => res)
    const suggestedStartTimesOfRelatedDoctor =
      suggestedAppointments.filter(item => item.doctor_id === appointment.doctor_id)
      .map(item => item.start_appointment_time).filter(res => res)

    const overlapSlot =
      Math.max(
        Number(timeSlotOfRelatedPatient.split('-')[0]),
        Number(timeSlotOfRelatedDoctor.split('-')[0])
      ) <=
      Math.min(
        Number(timeSlotOfRelatedPatient.split('-')[1]),
        Number(timeSlotOfRelatedDoctor.split('-')[1])
      ) && [
      Math.max(
        Number(timeSlotOfRelatedPatient.split('-')[0]),
        Number(timeSlotOfRelatedDoctor.split('-')[0])
      ),
      Math.min(
        Number(timeSlotOfRelatedPatient.split('-')[1]),
        Number(timeSlotOfRelatedDoctor.split('-')[1])
      )
    ].sort();

    const fits = overlapSlot[0] <= appointment.start_appointment_time
      && appointment.start_appointment_time < overlapSlot[1];

    const conflictedStartTimes = [...new Set([
      ...appointmentsOfRelatedPatient.filter(item => item.start_appointment_time === appointment.start_appointment_time),
      ...appointmentsOfRelatedDoctor.filter(item => item.start_appointment_time === appointment.start_appointment_time)
    ])];

    const suggestedAppointmentTime = () => {
      const availableHours = overlapSlot
        ? Array( overlapSlot[1] - overlapSlot[0] ).fill().map((_, i) => overlapSlot[0] + i)
        : undefined

      return availableHours && availableHours.filter(hr =>
        !suggestedStartTimesOfRelatedPatient?.includes(hr) && !suggestedStartTimesOfRelatedDoctor?.includes(hr))[0]
    }

    suggestedAppointments.push({
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: suggestedAppointmentTime() || 'n/a',
      inapt: !overlapSlot || !suggestedAppointmentTime(),
      suggested: appointment.start_appointment_time !== suggestedAppointmentTime() && overlapSlot
    });

    return {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      inapt: !fits,
      conflicts: conflictedStartTimes.length > 1
    }
  });

  return {
    requestedAppointments: validateAppointments,
    suggestedAppointments: suggestedAppointments
  }
}

module.exports = collector;
