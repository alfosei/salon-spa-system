require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();
const PORT = 3000;
const prisma = new PrismaClient();

app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    res.status(400).json({ message: 'Could not create user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

app.get('/', (req, res) => {
  res.send('Salon & Spa backend is running');
});

app.get('/api/services', async (req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

app.get('/api/services/:id', async (req, res) => {
  const requestedId = Number(req.params.id);
  const service = await prisma.service.findUnique({
    where: { id: requestedId },
  });

  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  res.json(service);
});

app.post('/api/services', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, category, price, duration } = req.body;

  const newService = await prisma.service.create({
    data: { name, category, price, duration },
  });

  res.status(201).json(newService);
});

app.put('/api/services/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const { name, category, price, duration } = req.body;

  try {
    const updatedService = await prisma.service.update({
      where: { id: requestedId },
      data: { name, category, price, duration },
    });

    res.json(updatedService);
  } catch (error) {
    res.status(404).json({ message: 'Service not found' });
  }
});

app.delete('/api/services/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);

  try {
    const deletedService = await prisma.service.delete({
      where: { id: requestedId },
    });

    res.json(deletedService);
  } catch (error) {
    res.status(404).json({ message: 'Service not found' });
  }
});

app.get('/api/clients', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const clients = await prisma.client.findMany({
    include: { user: { select: { email: true } } },
  });
  res.json(clients);
});

app.get('/api/clients/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const client = await prisma.client.findUnique({
    where: { id: requestedId },
    include: { user: { select: { email: true } } },
  });

  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }

  res.json(client);
});

app.post('/api/clients', authenticate, authorize('ADMIN'), async (req, res) => {
  const { userId, fullName, phone } = req.body;

  try {
    const newClient = await prisma.client.create({
      data: { userId, fullName, phone },
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(400).json({ message: 'Could not create client', error: error.message });
  }
});

app.put('/api/clients/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const { fullName, phone } = req.body;

  try {
    const updatedClient = await prisma.client.update({
      where: { id: requestedId },
      data: { fullName, phone },
    });
    res.json(updatedClient);
  } catch (error) {
    res.status(404).json({ message: 'Client not found' });
  }
});

app.delete('/api/clients/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);

  try {
    const deletedClient = await prisma.client.delete({
      where: { id: requestedId },
    });
    res.json(deletedClient);
  } catch (error) {
    res.status(404).json({ message: 'Client not found' });
  }
});

app.get('/api/staff', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const staff = await prisma.staff.findMany({
    include: { user: { select: { email: true } } },
  });
  res.json(staff);
});

app.get('/api/staff/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const staffMember = await prisma.staff.findUnique({
    where: { id: requestedId },
    include: { user: { select: { email: true } } },
  });

  if (!staffMember) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  res.json(staffMember);
});

app.post('/api/staff', authenticate, authorize('ADMIN'), async (req, res) => {
  const { userId, fullName, position } = req.body;

  try {
    const newStaff = await prisma.staff.create({
      data: { userId, fullName, position },
    });
    res.status(201).json(newStaff);
  } catch (error) {
    res.status(400).json({ message: 'Could not create staff member', error: error.message });
  }
});

app.put('/api/staff/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const { fullName, position, isActive } = req.body;

  try {
    const updatedStaff = await prisma.staff.update({
      where: { id: requestedId },
      data: { fullName, position, isActive },
    });
    res.json(updatedStaff);
  } catch (error) {
    res.status(404).json({ message: 'Staff member not found' });
  }
});

app.delete('/api/staff/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);

  try {
    const deletedStaff = await prisma.staff.delete({
      where: { id: requestedId },
    });
    res.json(deletedStaff);
  } catch (error) {
    res.status(404).json({ message: 'Staff member not found' });
  }
});

app.get('/api/appointments', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    include: {
      client: { select: { fullName: true } },
      staff: { select: { fullName: true } },
      service: { select: { name: true, price: true, duration: true } },
    },
  });
  res.json(appointments);
});

app.get('/api/appointments/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const appointment = await prisma.appointment.findUnique({
    where: { id: requestedId },
    include: {
      client: { select: { fullName: true } },
      staff: { select: { fullName: true } },
      service: { select: { name: true, price: true, duration: true } },
    },
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  res.json(appointment);
});

app.post('/api/appointments', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const { clientId, staffId, serviceId, dateTime } = req.body;

  try {
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId,
        staffId,
        serviceId,
        dateTime: new Date(dateTime),
      },
    });
    res.status(201).json(newAppointment);
  } catch (error) {
    res.status(400).json({ message: 'Could not create appointment', error: error.message });
  }
});

app.put('/api/appointments/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const { staffId, dateTime, status } = req.body;

  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: requestedId },
      data: {
        staffId,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        status,
      },
    });
    res.json(updatedAppointment);
  } catch (error) {
    res.status(404).json({ message: 'Appointment not found' });
  }
});

app.delete('/api/appointments/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const requestedId = Number(req.params.id);

  try {
    const deletedAppointment = await prisma.appointment.delete({
      where: { id: requestedId },
    });
    res.json(deletedAppointment);
  } catch (error) {
    res.status(404).json({ message: 'Appointment not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});