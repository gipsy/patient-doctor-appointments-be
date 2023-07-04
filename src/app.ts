import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv                from 'dotenv';
import Patient, { IPatient } from './models/patient';
import Doctor, { IDoctor } from './models/doctor';
import Appointment, { IAppointment } from './models/appointment';

const { httpLogger } = require('./middlewares');
const { logger } = require('./utils');

const donation = {
  user: 0,
  amount: 0
};

const app = express();
dotenv.config();

app.use(express.json());
app.use(cors());

app.use(httpLogger);

const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

const start = async () => {
  try {
    await mongoose.connect( `${DATABASE_URL}` );
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
  });

  const sseId = new Date().toDateString();

  setInterval(() => {
    writeEvent(res, sseId, JSON.stringify(donation));
  }, SEND_INTERVAL);

  writeEvent(res, sseId, JSON.stringify(donation));
};

app.post('/donate', (req, res) => {
  console.log('donate', req)
  const amount = req.body.amount || 0;
  
  if (amount > 0) {
    donation.amount += amount;
    donation.user += 1;
  }
  
  return res.json({ message: 'Thank you ?'});
});

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
    
    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
})
//app.get('/patients', (req: Request, res: Response) => {
//});
app.post('/patients', async(req: Request<never, never, IPatient[], never>, res: Response) => {
  const patients = req.body;
  console.log('POST patients', patients);
  
  const duplicates = await Patient.find({ id: { $in: patients.map( patient => patient.id )} })
  
  const patientsValidation = patients.map((patient) => {
    const idValid = 'id' in patient;
    const nameValid = patient.name && patient.name.split(' ').length < 3;
    const timeSlotValid = () => {
      return 'time_slot' in patient
        && Number(patient.time_slot.split('-')[0]) < Number(patient.time_slot.split('-')[1])
        && Number(patient.time_slot.split('-')[1]) > 1
        && Number(patient.time_slot.split('-')[1]) <= 24
    }

    return {
      id: patient.id, idValid,
      name: patient.name, nameValid: nameValid === undefined ? true : nameValid,
      time_slot: patient.time_slot,
      timeSlotValid: timeSlotValid(),
      isDuplicate: (duplicates.map(item => item.id).includes(patient.id))
    }
  });
  
  const validPatients = patientsValidation.map((patient) => {
    if (patient.idValid && patient.nameValid && patient.timeSlotValid) {
      return {
        id: patient.id,
        name: patient.name,
        time_slot: patient.time_slot
        //start_attend_time: patient.start_attend_time,
        //end_attend_time: patient.end_attend_time
      }
    }
  }).filter((item) => item)
  
  try {
    if (patients.length > 0 && validPatients.length === patients.length) {
      await Patient.insertMany(patients, { ordered: false })
      return await res.status(200)
        .json({ message: 'Patients inserted successfully', data: patients });
    }
    throw new Error('Patient collection are empty or has wrong format')
  } catch(error) {
    res.status(500).send({ message: error, data: { patientsValidation } })
  }
});


app.get('/doctors', (req: Request, res: Response) => {
});
app.post('/doctors', async (req: Request<never, never, IDoctor[], never>, res: Response) => {
  const doctors = req.body;
  console.log('POST doctors', doctors);
  
  const duplicates = await Doctor.find({ id: { $in: doctors.map( doctor => doctor.id ) } })
  
  const doctorsValidation = doctors.map((doctor) => {
    const idValid = 'id' in doctor;
    const nameValid = doctor.name && doctor.name.split(' ').length < 3;
    const timeSlotValid = () => {
      return 'time_slot' in doctor
        && Number(doctor.time_slot.split('-')[0]) < Number(doctor.time_slot.split('-')[1])
        && Number(doctor.time_slot.split('-')[1]) > 1
        && Number(doctor.time_slot.split('-')[1]) <= 24
    }
    
    return {
      id: doctor.id, idValid,
      name: doctor.name, nameValid: nameValid === undefined ? true : nameValid,
      time_slot: doctor.time_slot,
      timeSlotValid: timeSlotValid(),
      isDuplicate: duplicates.map(item => item.id).includes(doctor.id)
    }
  });
  
  const validDoctors = doctorsValidation.filter((doctor) => {
    return doctor.idValid && doctor.nameValid && doctor.timeSlotValid
  });
  
  try {
    if (doctors.length > 0 && validDoctors.length === doctors.length) {
      await Doctor.insertMany(doctors)
      return await res.status(200)
        .json({ message: 'Doctors inserted successfully', data: doctors });
    }
    throw 'Doctor collection are empty or has wrong format';
  } catch (error) {
    res.status(500).json({ message: error, data: doctorsValidation });
  }
});


app.get('/appointments', (req: Request, res: Response) => {
});
app.post('/appointments', async (req: Request<never, never, IAppointment[], never>, res: Response) => {
  const appointments = req.body;
  
  const appointmentsValidation = appointments.map((item) => {
    let patientIdValid = 'patient_id' in item;
    let doctorIdValid = 'doctor_id' in item;

    return {
      patientIdValid,
      doctorIdValid,
    }
  });
  
  const validAppointments = appointmentsValidation.filter((appointment) => {
    return appointment.patientIdValid && appointment.doctorIdValid;
  });

  try {
    if (appointments.length > 0 && validAppointments.length === appointments.length) {
      await Appointment.insertMany( appointments )
      return await res.status(200)
        .json({ message: 'Appointments inserted successfully', data: appointments });
    }
    throw 'Appointment collection are empty or has wrong format';
  } catch(error) {
    res.status(500).send({ message: error, body: appointmentsValidation });
  }
});
