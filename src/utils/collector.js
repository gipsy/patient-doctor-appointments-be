function range(start, end) {
  return Array(end - start/* + 1 if last number in range required */ )
    .fill().map((_, idx) => start + idx)
}

function overlapTimeSlot(patientSlot, doctorSlot) {
  if (Math.max( patientSlot[ 0 ], doctorSlot[ 0 ] ) <= Math.min( patientSlot[ 1 ], doctorSlot[ 1 ] )) {
    return [
      Math.max( patientSlot[ 0 ], doctorSlot[ 0 ] ),
      Math.min( patientSlot[ 1 ], doctorSlot[ 1 ] )
    ].sort( ( a, b ) => a - b );
  }
}

function usedStartTimesOfDPR(id, appointments, idProperty) {
  return appointments.filter(appointment => appointment[idProperty] === id)
    .map(item => item.start_appointment_time).filter(res => res)
}

const timeSlotByPatientId = (id, patients) => patients.find(patient => patient.id === id).time_slot;
const timeSlotByDoctorId = (id, doctors) => doctors.find(doctor => doctor.id === id).time_slot;


const collector = ({appointments, patients, doctors}) => {
  let suggestedAppointments = [];

  function overlapSlot(idx) {
    if (Math.max(
      Number(timeSlotByPatientId(appointments[idx].patient_id, patients).split('-')[0]),
      Number(timeSlotByDoctorId(appointments[idx].doctor_id, doctors).split('-')[0])
    ) <= Math.min(
      Number(timeSlotByPatientId(appointments[idx].patient_id, patients).split('-')[1]),
      Number(timeSlotByDoctorId(appointments[idx].doctor_id, doctors).split('-')[1])
    )) {
      return [
        Math.max(
          Number(timeSlotByPatientId(appointments[idx].patient_id, patients).split('-')[0]),
          Number(timeSlotByDoctorId(appointments[idx].doctor_id, doctors).split('-')[0])
        ),
        Math.min(
          Number(timeSlotByPatientId(appointments[idx].patient_id, patients).split('-')[1]),
          Number(timeSlotByDoctorId(appointments[idx].doctor_id, doctors).split('-')[1])
        )
      ].sort((a,b) => a - b);
    }
  }

  const fits = (appointment, index) => {
    return overlapSlot(index)[0] <= appointment.start_appointment_time
      && appointment.start_appointment_time < overlapSlot(index)[1];
  }

  const isConflicted = (appointment) => {
    return usedStartTimesOfDPR(appointment.patient_id, appointments, 'patient_id').filter(item =>
      item === appointment.start_appointment_time).length > 1
      || usedStartTimesOfDPR(appointment.doctor_id, appointments, 'doctor_id').filter(item =>
      item === appointment.start_appointment_time).length > 1
  }

  const rearrangedAppointments = (appointment) => {
    let newSuggestedAppointments = []
    const availableDoctors = doctors.map(doctor => {

      const patientTimeSlot = timeSlotByPatientId(appointment.patient_id, patients)
        .split('-').map(hr => Number(hr));
      const doctorTimeSlot = timeSlotByDoctorId(doctor.id, doctors)
        .split('-').map(hr => Number(hr));

      const overlapSlot = overlapTimeSlot(patientTimeSlot, doctorTimeSlot)

      return {
        id: doctor.id,
        time_range: range(overlapSlot[0], overlapSlot[1])
      }
    })
    for (let i = 0; i < appointments.length; i++) {
      const appointment = {
        _id: appointments[i]._id,
        patient_id: appointments[i].patient_id,
        doctor_id: availableDoctors[0].id,
        start_appointment_time: availableDoctors[0].time_range[0],
        suggested: !appointments[i]?.start_appointment_time
          || appointments[i].doctor_id !== availableDoctors[0].id
          || appointments[i]?.start_appointment_time !== availableDoctors[0].time_range[0]
      }
      newSuggestedAppointments.push(appointment);

      // remove used time and doctor when no time available
      availableDoctors[0].time_range.shift();
      if (availableDoctors[0].time_range.length === 0) {
        availableDoctors.shift()
      }
    }
    return newSuggestedAppointments;
  }

  const validateAppointments = appointments.map((appointment, appointmentIdx) => {

    const suggestedAvailableDoctors = () => {
      return doctors.filter(doctor => {
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
          ).filter(hr =>
            !usedStartTimesOfDPR(doctor.id, suggestedAppointments, 'doctor_id').includes(hr))
        }
      }).filter(doctor => doctor.time_range.length > 0);
    }

    const availableHours = overlapSlot(appointmentIdx)
      ? range( overlapSlot(appointmentIdx)[ 0 ], overlapSlot(appointmentIdx)[ 1 ] )
      : undefined;

    const suggestedTime = () => {
      if (availableHours.length > 0) {
        return availableHours.filter(hr =>
          !usedStartTimesOfDPR(appointment.patient_id, suggestedAppointments, 'patient_id')?.includes(hr)
          && !usedStartTimesOfDPR(appointment.patient_id, suggestedAppointments, 'doctor_id')?.includes(hr))[0]
      }
    }

    suggestedAppointments.push({
      _id: appointment._id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.start_appointment_time === undefined
        ? suggestedAvailableDoctors()[0]?.id
        : appointment.doctor_id,
      start_appointment_time:
        suggestedTime()
        || suggestedAvailableDoctors()[0]?.time_range[0],
      suggested:
        !fits(appointment, appointmentIdx)
        || suggestedTime() !== appointment.start_appointment_time
    });

    if (suggestedTime() === undefined || suggestedAvailableDoctors().length === 0) {
      suggestedAppointments = rearrangedAppointments(appointment);
    }

    return {
      _id: appointment._id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      conflicts: isConflicted(appointment),
      inapt: !fits(appointment, appointmentIdx)
    }
  });

  return {
    requestedAppointments: validateAppointments,
    suggestedAppointments: suggestedAppointments
  }
}

module.exports = collector;
