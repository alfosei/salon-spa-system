const express = require('express');
const { PrismaClient } = require('./generated/prisma');

const app = express();
const PORT = 3000;

app.use(express.json());


const prisma = new PrismaClient();

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

app.post('/api/services', async (req, res) => {
  const { name, category, price, duration } = req.body;

  const newService = await prisma.service.create({
    data: { name, category, price, duration },
  });

  res.status(201).json(newService);
});


app.put('/api/services/:id', async (req, res) => {
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

app.delete('/api/services/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});