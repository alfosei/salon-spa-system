const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());

const services = [
  { id: 1, name: 'Deep Conditioning', category: 'Hair', price: 250, duration: 60 },
  { id: 2, name: 'Manicure', category: 'Nails', price: 120, duration: 45 },
  { id: 3, name: 'Facial', category: 'Skincare', price: 180, duration: 50 },
];

app.get('/', (req, res) => {
  res.send('Salon & Spa backend is running');
});

app.get('/api/services', (req, res) => {
  res.json(services);
});

app.get('/api/services/:id', (req, res) => {
  const requestedId = Number(req.params.id);
  const service = services.find((s) => s.id === requestedId);

  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  res.json(service);
});

app.post('/api/services', (req, res) => {
  const { name, category, price, duration } = req.body;

  const newService = {
    id: services.length + 1,
    name,
    category,
    price,
    duration,
  };

  services.push(newService);
  res.status(201).json(newService);
});


app.put('/api/services/:id', (req, res) => {
  const requestedId = Number(req.params.id);
  const service = services.find((s) => s.id === requestedId);

  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  const { name, category, price, duration } = req.body;

  service.name = name;
  service.category = category;
  service.price = price;
  service.duration = duration;

  res.json(service);
});

app.delete('/api/services/:id', (req, res) => {
  const requestedId = Number(req.params.id);
  const index = services.findIndex((s) => s.id === requestedId);

  if (index === -1) {
    return res.status(404).json({ message: 'Service not found' });
  }

  const deleted = services.splice(index, 1);
  res.json(deleted[0]);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});