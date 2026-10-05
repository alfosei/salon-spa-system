require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('./middleware/auth');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const prisma = new PrismaClient();
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

app.use(helmet());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(cors());

// Logs the real error on the server (only you see this), and sends
// the client a short, safe message instead of internal error details.
function handleServerError(res, status, clientMessage, error) {
  console.error(clientMessage, '-', error.message);
  return res.status(status).json({ message: clientMessage });
}

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Checks whether a staff member is free for a given time window.
// Two time ranges overlap when startA < endB AND startB < endA.
// excludeAppointmentId lets a reschedule check availability without
// colliding with the appointment's own current booking.
async function isStaffAvailable(staffId, requestedStart, durationMinutes, excludeAppointmentId = null) {
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: { not: 'CANCELLED' },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: { service: true },
  });

  return !existingAppointments.some((existing) => {
    const existingStart = new Date(existing.dateTime);
    const existingEnd = new Date(existingStart.getTime() + existing.service.duration * 60000);
    return requestedStart < existingEnd && existingStart < requestedEnd;
  });
}

app.post('/api/auth/register', authLimiter, async (req, res) => {
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
    return handleServerError(res, 400, 'Could not create user', error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
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

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message,
    });
  }

  const { email, password, fullName, phone } = parsed.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, role: 'CLIENT' },
    });

    await prisma.client.create({
      data: { userId: newUser.id, fullName, phone },
    });

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token });
  } catch (error) {
    return handleServerError(res, 400, 'Could not create account', error);
  }
});

app.get('/', (req, res) => {
  res.send('Salon & Spa backend is running');
});

// ---------- ACCOUNT (self-service, any logged-in role) ----------

app.get('/api/users/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

app.put('/api/users/me/email', authenticate, async (req, res) => {
  const { newEmail, currentPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { email: newEmail },
    });

    res.json({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
  } catch (error) {
    return handleServerError(res, 400, 'Could not update email', error);
  }
});

app.put('/api/users/me/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated' });
  } catch (error) {
    return handleServerError(res, 400, 'Could not update password', error);
  }
});

// ---------- SERVICES ----------

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

// ---------- CLIENTS ----------
// IMPORTANT: literal paths (/me, /me/spending, /me/payments) must come
// BEFORE wildcard paths (/:id, /:id/spending), or the wildcard swallows them.

app.get('/api/clients/me', authenticate, authorize('CLIENT'), async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { userId: req.user.userId },
    include: { user: { select: { email: true } } },
  });

  if (!client) {
    return res.status(404).json({ message: 'Client profile not found for this user' });
  }

  res.json(client);
});

app.put('/api/clients/me', authenticate, authorize('CLIENT'), async (req, res) => {
  const { fullName, phone } = req.body;

  try {
    const client = await prisma.client.findUnique({ where: { userId: req.user.userId } });

    if (!client) {
      return res.status(404).json({ message: 'Client profile not found for this user' });
    }

    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { fullName, phone },
    });

    res.json(updatedClient);
  } catch (error) {
    return handleServerError(res, 400, 'Could not update profile', error);
  }
});

app.get('/api/clients/me/spending', authenticate, authorize('CLIENT'), async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { userId: req.user.userId },
  });

  if (!client) {
    return res.status(404).json({ message: 'Client profile not found for this user' });
  }

  const result = await prisma.payment.aggregate({
    where: { appointment: { clientId: client.id } },
    _sum: { amount: true },
    _count: true,
  });

  res.json({
    totalSpent: result._sum.amount || 0,
    totalSessions: result._count,
  });
});

app.get('/api/clients/me/payments', authenticate, authorize('CLIENT'), async (req, res) => {
  const client = await prisma.client.findUnique({ where: { userId: req.user.userId } });

  if (!client) {
    return res.status(404).json({ message: 'Client profile not found for this user' });
  }

  const payments = await prisma.payment.findMany({
    where: { appointment: { clientId: client.id } },
    include: {
      appointment: {
        include: {
          service: { select: { name: true } },
          staff: { select: { fullName: true } },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  });

  res.json(payments);
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
    return handleServerError(res, 400, 'Could not create client', error);
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

app.get('/api/clients/:id/spending', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const clientId = Number(req.params.id);

  const result = await prisma.payment.aggregate({
    where: { appointment: { clientId } },
    _sum: { amount: true },
    _count: true,
  });

  res.json({
    totalSpent: result._sum.amount || 0,
    totalSessions: result._count,
  });
});

// ---------- STAFF ----------

app.get('/api/staff/directory', authenticate, async (req, res) => {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, position: true },
  });
  res.json(staff);
});

app.get('/api/staff/me', authenticate, authorize('STAFF'), async (req, res) => {
  const staffMember = await prisma.staff.findUnique({
    where: { userId: req.user.userId },
    include: { user: { select: { email: true } } },
  });

  if (!staffMember) {
    return res.status(404).json({ message: 'Staff profile not found for this user' });
  }

  res.json(staffMember);
});

app.put('/api/staff/me', authenticate, authorize('STAFF'), async (req, res) => {
  const { fullName } = req.body;

  try {
    const staffMember = await prisma.staff.findUnique({ where: { userId: req.user.userId } });

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff profile not found for this user' });
    }

    const updated = await prisma.staff.update({
      where: { id: staffMember.id },
      data: { fullName },
    });

    res.json(updated);
  } catch (error) {
    return handleServerError(res, 400, 'Could not update profile', error);
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
    return handleServerError(res, 400, 'Could not create staff member', error);
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

// ---------- APPOINTMENTS ----------

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

app.get('/api/appointments/staff/my', authenticate, authorize('STAFF'), async (req, res) => {
  const staffMember = await prisma.staff.findUnique({
    where: { userId: req.user.userId },
  });

  if (!staffMember) {
    return res.status(404).json({ message: 'Staff profile not found for this user' });
  }

  const appointments = await prisma.appointment.findMany({
    where: { staffId: staffMember.id },
    include: {
      client: { select: { fullName: true } },
      service: { select: { name: true, price: true, duration: true } },
    },
  });

  res.json(appointments);
});

app.get('/api/appointments/my', authenticate, authorize('CLIENT'), async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { userId: req.user.userId },
  });

  if (!client) {
    return res.status(404).json({ message: 'Client profile not found for this user' });
  }

  const appointments = await prisma.appointment.findMany({
    where: { clientId: client.id },
    include: {
      staff: { select: { fullName: true } },
      service: { select: { name: true, price: true, duration: true } },
    },
  });

  res.json(appointments);
});

app.post('/api/appointments/my', authenticate, authorize('CLIENT'), async (req, res) => {
  const { staffId, serviceId, dateTime } = req.body;

  try {
    const client = await prisma.client.findUnique({
      where: { userId: req.user.userId },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client profile not found for this user' });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const available = await isStaffAvailable(staffId, new Date(dateTime), service.duration);

    if (!available) {
      return res.status(409).json({
        message: 'This staff member is already booked at that time. Please choose another time or staff member.',
      });
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        staffId,
        serviceId,
        dateTime: new Date(dateTime),
      },
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    return handleServerError(res, 400, 'Could not create appointment', error);
  }
});

app.put('/api/appointments/my/:id/cancel', authenticate, authorize('CLIENT'), async (req, res) => {
  const appointmentId = Number(req.params.id);

  try {
    const client = await prisma.client.findUnique({ where: { userId: req.user.userId } });

    if (!client) {
      return res.status(404).json({ message: 'Client profile not found for this user' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });

    // Ownership check: a client may only ever cancel their own appointment.
    if (!appointment || appointment.clientId !== client.id) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      return res.status(400).json({ message: 'This appointment can no longer be cancelled' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    return handleServerError(res, 400, 'Could not cancel appointment', error);
  }
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
    const service = await prisma.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const available = await isStaffAvailable(staffId, new Date(dateTime), service.duration);

    if (!available) {
      return res.status(409).json({ message: 'This staff member is already booked at that time' });
    }

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
    return handleServerError(res, 400, 'Could not create appointment', error);
  }
});

app.put('/api/appointments/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const requestedId = Number(req.params.id);
  const { staffId, dateTime, status } = req.body;

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: requestedId },
      include: { service: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only re-check availability if staff or time is actually changing —
    // a plain status update (e.g. cancelling) shouldn't trigger this.
    if (staffId || dateTime) {
      const effectiveStaffId = staffId || existing.staffId;
      const effectiveDateTime = dateTime ? new Date(dateTime) : existing.dateTime;

      const available = await isStaffAvailable(
        effectiveStaffId,
        effectiveDateTime,
        existing.service.duration,
        existing.id
      );

      if (!available) {
        return res.status(409).json({ message: 'This staff member is already booked at that time' });
      }
    }

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

app.post('/api/appointments/:id/pay', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
  const appointmentId = Number(req.params.id);
  const { amount } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
    });

    const payment = await prisma.payment.create({
      data: { appointmentId, amount },
    });

    res.status(201).json({ appointment: updatedAppointment, payment });
  } catch (error) {
    return handleServerError(res, 400, 'Could not process payment', error);
  }
});

// ---------- REPORTS ----------

app.get('/api/reports/daily-revenue', authenticate, authorize('ADMIN'), async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await prisma.payment.aggregate({
    where: { paidAt: { gte: startOfDay, lte: endOfDay } },
    _sum: { amount: true },
    _count: true,
  });

  res.json({
    date: startOfDay.toISOString().split('T')[0],
    totalRevenue: result._sum.amount || 0,
    totalPayments: result._count,
  });
});

app.get('/api/reports/monthly', authenticate, authorize('ADMIN'), async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [revenueResult, completedCount, newClientsCount, popularRaw] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.appointment.count({
      where: { status: 'COMPLETED', dateTime: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.client.count({
      where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.appointment.groupBy({
      by: ['serviceId'],
      where: { dateTime: { gte: startOfMonth, lte: endOfMonth } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 3,
    }),
  ]);

  const popularServices = await Promise.all(
    popularRaw.map(async (row) => {
      const service = await prisma.service.findUnique({ where: { id: row.serviceId } });
      return { name: service ? service.name : 'Unknown', count: row._count.serviceId };
    })
  );

  res.json({
    month: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    monthlyRevenue: revenueResult._sum.amount || 0,
    completedThisMonth: completedCount,
    newClientsThisMonth: newClientsCount,
    popularServices,
  });
});

// ---------- ATTENDANCE ----------

app.post('/api/attendance/clock-in', authenticate, authorize('STAFF'), async (req, res) => {
  const staffMember = await prisma.staff.findUnique({
    where: { userId: req.user.userId },
  });

  if (!staffMember) {
    return res.status(404).json({ message: 'Staff profile not found for this user' });
  }

  const attendance = await prisma.attendance.create({
    data: { staffId: staffMember.id },
  });

  res.status(201).json(attendance);
});

app.put('/api/attendance/:id/clock-out', authenticate, authorize('STAFF'), async (req, res) => {
  const attendanceId = Number(req.params.id);

  try {
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { clockOut: new Date() },
    });
    res.json(updatedAttendance);
  } catch (error) {
    res.status(404).json({ message: 'Attendance record not found' });
  }
});

app.get('/api/attendance/my', authenticate, authorize('STAFF'), async (req, res) => {
  const staffMember = await prisma.staff.findUnique({
    where: { userId: req.user.userId },
  });

  if (!staffMember) {
    return res.status(404).json({ message: 'Staff profile not found for this user' });
  }

  const attendance = await prisma.attendance.findMany({
    where: { staffId: staffMember.id },
    orderBy: { clockIn: 'desc' },
  });

  res.json(attendance);
});

app.get('/api/attendance', authenticate, authorize('ADMIN'), async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    include: { staff: { select: { fullName: true } } },
  });
  res.json(attendance);
});

// ---------- ADVISOR ----------

app.post('/api/advisor', authenticate, async (req, res) => {
  const { message } = req.body;

  try {
    const services = await prisma.service.findMany();

    if (!anthropic) {
      const lowerMessage = message.toLowerCase();
      const matched =
        services.find((s) => lowerMessage.includes(s.category.toLowerCase())) ||
        services[0];

      return res.json({
        reply: `[Mock advisor — no API key configured] Based on what you described, I'd suggest ${matched.name} (GH₵${matched.price}, ${matched.duration} min). This is a placeholder response for testing — connect a real ANTHROPIC_API_KEY to get genuine AI recommendations.`,
      });
    }

    const servicesList = services
      .map((s) => `- ${s.name} (${s.category}): GH₵${s.price}, ${s.duration} min`)
      .join('\n');

    const systemPrompt = `You are a beauty and wellness advisor for a salon and spa. You must ONLY recommend services from this exact list — never invent a service that isn't listed:

${servicesList}

Rules:
- Recommend exactly one service that best fits the client's goal, and briefly explain why.
- If nothing in the list fits well, say so honestly rather than forcing a match.
- Do not diagnose medical conditions. If the client's message suggests a medical issue, gently suggest they see a doctor instead, and do not recommend a service for it.
- Keep your response short — 2 to 4 sentences.`;

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    res.json({ reply: aiResponse.content[0].text });
  } catch (error) {
    return handleServerError(res, 500, 'Advisor request failed', error);
  }
});

// ---------- PAYMENTS (Paystack) ----------

async function confirmPaystackPayment(paystackData) {
  if (paystackData.status !== 'success') {
    return { ok: false, reason: 'Payment was not successful' };
  }

  const appointmentId = Number(paystackData.metadata?.appointmentId);

  if (!appointmentId) {
    return { ok: false, reason: 'No appointment linked to this payment' };
  }

  const existingPayment = await prisma.payment.findUnique({ where: { appointmentId } });

  if (existingPayment) {
    return { ok: true, alreadyProcessed: true };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'COMPLETED' },
  });

  await prisma.payment.create({
    data: {
      appointmentId,
      amount: paystackData.amount / 100,
    },
  });

  return { ok: true, alreadyProcessed: false };
}

app.post('/api/appointments/:id/initiate-payment', authenticate, authorize('CLIENT'), async (req, res) => {
  const appointmentId = Number(req.params.id);

  try {
    const client = await prisma.client.findUnique({
      where: { userId: req.user.userId },
      include: { user: { select: { email: true } } },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client profile not found for this user' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });

    if (!appointment || appointment.clientId !== client.id) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      return res.status(400).json({ message: 'This appointment cannot be paid for' });
    }

    const reference = `ozel_${appointment.id}_${Date.now()}`;
    const amountInPesewas = Math.round(appointment.service.price * 100);

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: client.user.email,
        amount: amountInPesewas,
        reference,
        callback_url: process.env.FRONTEND_URL,
        channels: ['card', 'mobile_money', 'bank_transfer'],
        metadata: { appointmentId: appointment.id },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return handleServerError(res, 400, 'Could not start payment', new Error(paystackData.message));
    }

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (error) {
    return handleServerError(res, 500, 'Could not start payment', error);
  }
});

app.get('/api/payments/verify/:reference', authenticate, async (req, res) => {
  const { reference } = req.params;

  try {
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const result = await paystackResponse.json();

    if (!result.status) {
      return res.status(400).json({ message: 'Could not verify payment' });
    }

    const confirmation = await confirmPaystackPayment(result.data);

    if (!confirmation.ok) {
      return res.status(400).json({ message: confirmation.reason });
    }

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    return handleServerError(res, 500, 'Could not verify payment', error);
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.sendStatus(401);
  }

  if (req.body.event === 'charge.success') {
    try {
      await confirmPaystackPayment(req.body.data);
    } catch (error) {
      console.error('Webhook processing error -', error.message);
    }
  }

  res.sendStatus(200);
});

// ---------- DASHBOARD ----------

app.get('/api/dashboard', authenticate, authorize('ADMIN'), async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayRevenue,
    totalAppointmentsToday,
    completedToday,
    pendingCount,
    cancelledCount,
    totalClients,
    newClientsToday,
    staffClockedInToday,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true },
    }),
    prisma.appointment.count({
      where: { dateTime: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.appointment.count({
      where: { status: 'COMPLETED', dateTime: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.appointment.count({
      where: { status: 'PENDING' },
    }),
    prisma.appointment.count({
      where: { status: 'CANCELLED' },
    }),
    prisma.client.count(),
    prisma.client.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.attendance.count({
      where: { clockIn: { gte: startOfDay, lte: endOfDay } },
    }),
  ]);

  res.json({
    date: startOfDay.toISOString().split('T')[0],
    todayRevenue: todayRevenue._sum.amount || 0,
    appointmentsToday: totalAppointmentsToday,
    completedToday,
    pendingAppointments: pendingCount,
    cancelledAppointments: cancelledCount,
    totalClients,
    newClientsToday,
    staffClockedInToday,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});