import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv                from 'dotenv';
import Patient, { IPatient } from './models/patient';
import Doctor, { IDoctor } from './models/doctor';
import Appointment, { IAppointment, ISuggestedAppointment } from './models/appointment';

const { httpLogger } = require('./middlewares');
const { logger, collector } = require('./utils');

interface State {
  patients: IPatient[];
  doctors: IDoctor[];
  appointments: IAppointment[];
}

const state: State = {
  patients: [],
  doctors: [],
  appointments: []
}

const app = express();
dotenv.config();

app.use(express.json());
app.use(cors({ origin: true }));

app.use(httpLogger);

const PORT = process.env.PORT || 4650;
const DATABASE_URL = process.env.DATABASE_URL;

const start = async () => {
  try {
    await mongoose.connect( `${DATABASE_URL}` );
    state.patients = await Patient.find();
    state.doctors = await Doctor.find();
    state.appointments = await Appointment.find();
    await app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();


const SEND_INTERVAL = 2000;

const writeEvent = (res: Response, sseId: string, data: string) => {
  res.write(`id: ${sseId}\n`);
  res.write(`data: ${data}\n\n`);
};

const sendEvent = (_req: Request, res: Response) => {
  
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Credentials': 'true'
  });

  const sseId = new Date().toDateString();

  setInterval(() => {
    writeEvent(res, sseId, JSON.stringify(collector(state)));
  }, SEND_INTERVAL);

  writeEvent(res, sseId, JSON.stringify(collector(state)));
};

app.get('/dashboard', (req: Request, res: Response) => {
  if (req.headers.accept === 'text/event-stream') {
    sendEvent(req, res);
  } else {
    res.json({ message: 'Ok' });
  }
});

app.delete('/delete/all', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Create an array of collection names and drop each collection
    collections
      .map((collection) => collection.name)
      .forEach(async (collectionName) => {
        db.dropCollection(collectionName);
      });
  
    state.patients = await Patient.find();
    state.doctors = await Doctor.find();
    state.appointments = await Appointment.find();
    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
})

app.get('/patient/:id', async(req: Request, res: Response) => {
  const id = req.params.id;
  
  try {
    const patient = await Patient.findOne({ id });
  
    return await res.status(200).json(patient);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/patients', async(req: Request<never, never, IPatient[], never>, res: Response) => {
  const patients = req.body;
  
  const duplicates = await Patient.find({ id: { $in: patients.map( patient => patient.id )} })
  
  const patientsValidation = patients.map((patient) => {
    const idValid = 'id' in patient;
    const nameValid = patient?.name ? patient.name.split(' ').length < 3 : true;
    const birthDateValid = patient?.birth_date ? !isNaN(Date.parse(patient.birth_date.replace(/(\d+)(\.|-|\/)(\d+)/,'$3/$1'))) : true;
    const isDuplicate = typeof duplicates.find(item => item.id === Number(patient.id)) === 'object';
    const timeSlotValid = () => {
      return 'time_slot' in patient
        && Number(patient.time_slot.split('-')[0]) < Number(patient.time_slot.split('-')[1])
        && Number(patient.time_slot.split('-')[1]) > 1
        && Number(patient.time_slot.split('-')[1]) <= 24
    }
    const paramsAmountValid = Object.keys(patient).length < 5

    return {
      id: patient.id,
      time_slot: patient.time_slot,
      name: patient.name,
      birth_date: patient.birth_date,
      idValid,
      nameValid: nameValid === undefined ? true : nameValid,
      birthDateValid: birthDateValid === undefined ? true : birthDateValid,
      timeSlotValid: timeSlotValid(),
      isDuplicate,
      paramsAmountValid
    }
  });
  
  const validPatients = patientsValidation.map((patient) => {
    if (patient.idValid && patient.nameValid && patient.timeSlotValid) {
      return {
        id: patient.id,
        ...( patient.name && { name: patient.name } ),
        ...( patient.birth_date && { birth_date: patient.birth_date } ),
        time_slot: patient.time_slot,
      }
    }
  }).filter((item) => item)
  
  try {
    if (patients.length > 0 && validPatients.length === patients.length) {
      const results = await Patient.insertMany(validPatients, { ordered: false})
      state.patients = await Patient.find()
      return await res.status(200).json(results);
    }
    throw 'Patient collection are empty or has wrong format'
  } catch(error) {
    res.status(500).send({ message: error, patientsValidation })
  }
});

app.get('/doctor/:id', async(req: Request, res: Response) => {
  const id = req.params.id;
  
  try {
    const doctor = await Doctor.findOne({ id });
    console.log('doctor',doctor)
    
    return await res.status(200).json(doctor);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/doctors', async (req: Request<never, never, IDoctor[], never>, res: Response) => {
  const doctors = req.body;
  
  const duplicates = await Doctor.find({ id: { $in: doctors.map( doctor => Number(doctor.id) ) } })
  
  const doctorsValidation = doctors.map((doctor) => {
    const idValid = 'id' in doctor;
    const nameValid = doctor.name ? doctor.name.split(' ').length < 3 : true;
    const birthDateValid = doctor.birth_date ? !isNaN(Date.parse(doctor.birth_date.replace(/(\d+)(\.|-|\/)(\d+)/,'$3/$1'))) : true;
    const isDuplicate = typeof duplicates.find(item => item.id === Number(doctor.id)) === 'object';
    const timeSlotValid = () => {
      return 'time_slot' in doctor
        && Number(doctor.time_slot.split('-')[0]) < Number(doctor.time_slot.split('-')[1])
        && Number(doctor.time_slot.split('-')[1]) > 1
        && Number(doctor.time_slot.split('-')[1]) <= 24
    }
    const paramsAmountValid = Object.keys(doctor).length < 5
    
    return {
      id: doctor.id,
      name: doctor.name,
      birth_date: doctor.birth_date,
      time_slot: doctor.time_slot,
      idValid,
      nameValid: nameValid === undefined ? true : nameValid,
      birthDateValid: birthDateValid === undefined ? true : birthDateValid,
      timeSlotValid: timeSlotValid(),
      isDuplicate,
      paramsAmountValid
    }
  });
  
  const validDoctors = doctorsValidation.map((doctor) => {
    if (doctor.idValid && doctor.nameValid && doctor.timeSlotValid) {
      return {
        id: doctor.id,
        ...( doctor.name && { name: doctor.name } ),
        ...( doctor.birth_date && { birth_date: doctor.birth_date } ),
        time_slot: doctor.time_slot,
      };
    }
  }).filter((item) => item)
  
  try {
    if (doctors.length > 0 && validDoctors.length === doctors.length) {
      const results = await Doctor.insertMany(validDoctors, { ordered: false});
      state.doctors = await Doctor.find();
      
      return await res.status(200).json(results);
    }
    throw 'Doctor collection are empty or has wrong format';
  } catch (error) {
    res.status(500).json({ message: error, doctorsValidation });
  }
});


app.post('/appointments', async (req: Request<never, never, IAppointment[], never>, res: Response) => {
  const appointments = req.body;
  
  const appointmentsValidation = appointments.map((appointment) => {
    let patientIdValid = 'patient_id' in appointment;
    let doctorIdValid = 'doctor_id' in appointment;

    return {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      patientIdValid,
      doctorIdValid,
    }
  });
  
  const validAppointments = appointmentsValidation.map((appointment) => {
    if (appointment.doctorIdValid && appointment.patientIdValid) {
      return {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        ...( appointment.start_appointment_time && { start_appointment_time: Number(appointment.start_appointment_time) } )
      }
    }
  });

  try {
    if (appointments.length > 0 && validAppointments.length === appointments.length) {
      const results = await Appointment.insertMany( validAppointments );
      state.appointments = await Appointment.find();
      
      return await res.status(200).json(results);
    }
    throw 'Appointment collection are empty or has wrong format';
  } catch(error) {
    res.status(500).send({ message: error, appointmentsValidation });
  }
});

app.put('/appointments', async (req: Request<never, never, ISuggestedAppointment[], never>, res: Response) => {
  const appointments = req.body;
  
  const appointmentsValidation = appointments.map((appointment) => {
    let idValid = '_id' in appointment;
    let patientIdValid = 'patient_id' in appointment;
    let doctorIdValid = 'doctor_id' in appointment;
    
    return {
      _id: appointment._id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      start_appointment_time: appointment.start_appointment_time,
      idValid,
      patientIdValid,
      doctorIdValid,
    }
  });
  
  const validAppointments = appointmentsValidation.map((appointment) => {
    if (appointment.doctorIdValid && appointment.patientIdValid && appointment.idValid) {
      return {
        _id: appointment._id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        ...( appointment.start_appointment_time && { start_appointment_time: appointment.start_appointment_time } )
      }
    }
  });
  
  try {
    if (appointments.length > 0 && validAppointments.length === appointments.length){
      //@ts-ignore
      await Appointment.bulkWrite(appointments.map(appointment => {
        return {
          updateOne: {
            filter: { _id: appointment._id },
            update: {
              $set: {
                start_appointment_time: appointment.start_appointment_time
              }
            }
          }
        }
      }))
      state.appointments = await Appointment.find();
      return await res.status(200).json('OK');
    }
    throw 'Appointment collection are empty or has wrong format';
  } catch(error) {
    res.status(500).send({ message: error, appointmentsValidation });
  }
});

app.get('/', async (req, res) => {
  res.status(200).send({ message: 'OK' });
})
