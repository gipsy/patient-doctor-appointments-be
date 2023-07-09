function range(start, end) {
  return Array(end - start/* + 1 if last number in range required */ )
    .fill().map((_, idx) => start + idx)
}

function usedStartTimesOfRelatedDoctor(doctorId, appointments) {
  return appointments.filter(appointment => appointment.doctor_id === doctorId)
    .map(item => item.start_appointment_time).filter(res => res)
}

function appointmentsOfRelatedPatient(patientId, appointments) {
  return appointments.filter(appointment => appointment.patient_id === patientId);
}

function appointmentsOfRelatedDoctor(doctorId, appointments) {
  return appointments.filter(appointment => appointment.doctor_id === doctorId);
}

const collector = ({appointments, patients, doctors}) => {

  let suggestedAppointments = [];

  const validateAppointments = appointments.map((appointment, appIdx) => {

    // const appointmentsOfRelatedPatient = appointments.filter(item => item.patient_id === appointment.patient_id);
    // const appointmentsOfRelatedDoctor = appointments.filter(item => item.doctor_id === appointment.doctor_id);

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
    ].sort((a, b) => a - b);

    const fits = overlapSlot[0] <= appointment.start_appointment_time
      && appointment.start_appointment_time < overlapSlot[1];

    const conflictedRequestedAppointments = [...new Set([
      ...appointmentsOfRelatedPatient(appointment.patient_id, appointments).filter(item =>
        item.start_appointment_time === appointment.start_appointment_time),
      ...appointmentsOfRelatedDoctor(appointment.doctor_id, appointments).filter(item =>
        item.start_appointment_time === appointment.start_appointment_time)
    ])];

    const conflictedSuggestedAppointments = [...new Set([
      ...appointmentsOfRelatedPatient(appointment.patient_id, suggestedAppointments).filter(item =>
        item.start_appointment_time === appointment.start_appointment_time),
      ...appointmentsOfRelatedDoctor(appointment.doctor_id, suggestedAppointments).filter(item =>
        item.start_appointment_time === appointment.start_appointment_time)
    ])];

    const suggestedAvailableDoctor = () => {
      const availableDoctors = doctors.filter(doctor => {
        const timeSlot = doctor.time_slot.split('-').map(hr => Number(hr));

        return timeSlot[0] <= appointment.start_appointment_time
          && appointment.start_appointment_time < timeSlot[1]
      })
      .map(doctor => {
        return {
          id: doctor.id,
          time_range: range(
            Number(doctor.time_slot.split('-')[0]),
            Number(doctor.time_slot.split('-')[1])
          ).filter(hr => !usedStartTimesOfRelatedDoctor(doctor.id, suggestedAppointments).includes(hr))
        }
      }).filter(doctor => doctor.time_range.length > 0);
      // console.log('availableDoctors',availableDoctors)
      // console.log('availableDoctors',availableDoctors)
      // console.log('filteredDoctors', availableDoctors.filter(doctor => doctor.time_range.length > 0))
      // console.log('usedStartTimesOfRelatedDoctor',usedStartTimesOfRelatedDoctor(202, suggestedAppointments))
      return availableDoctors[0];
    }

    const suggestedTime = () => {
      const availableHours = overlapSlot
        ? range( overlapSlot[ 0 ], overlapSlot[ 1 ] )
        : undefined;

      if (availableHours.length > 0) {
        return availableHours.filter(hr =>
          !suggestedStartTimesOfRelatedPatient?.includes(hr)
          && !suggestedStartTimesOfRelatedDoctor?.includes(hr))[0]
      }
    }

    suggestedAppointments.push({
      _id: appointment._id,
      patient_id: appointment.patient_id,
      doctor_id: suggestedTime() === undefined
        //(conflictedSuggestedAppointments.length > 1 || !fits) &&
        ? suggestedAvailableDoctor()?.id
        : appointment.doctor_id,
      start_appointment_time:
        // conflictedSuggestedAppointments.length > 1 || !fits
        // ? suggestedTime() || suggestedAvailableDoctor()?.time_range[0]
        // : appointment.start_appointment_time,
        suggestedTime() || suggestedAvailableDoctor()?.time_range[0],
      suggested:
        !fits
        && appointment.start_appointment_time !== undefined
        && appointment.start_appointment_time !== suggestedTime()
        && appointment.start_appointment_time !== suggestedAvailableDoctor()?.time_range[0]
    });
    // console.log('overlapSlot', overlapSlot)
    console.log('suggestedTime', suggestedTime());
    console.log('suggestedAvailableDoctor', suggestedAvailableDoctor())
    // console.log(appointment.start_appointment_time !== undefined)
    // console.log(appointment.start_appointment_time !== suggestedTime())
    // console.log('suggestedTime',suggestedTime())
    // console.log(appointment.start_appointment_time !== suggestedAvailableDoctor()?.time_range[0])
    // console.log(appointment.start_appointment_time !== 'n/a')
    // console.log('overlapSlot', overlapSlot)
    // console.log(!conflictedSuggestedAppointments.length > 1)
    // console.log('conflictedSuggestedAppointments',conflictedSuggestedAppointments)
    // console.log('appointmentsOfRelatedPatient',appointmentsOfRelatedPatient(appointment.patient_id, suggestedAppointments))
    console.log('fits', fits)
    console.log('------------------')

    return {
      _id: appointment._id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      conflicts: conflictedRequestedAppointments.length > 1,
      inapt: !fits
    }
  });

  return {
    requestedAppointments: validateAppointments,
    suggestedAppointments: suggestedAppointments
  }
}

module.exports = collector;
