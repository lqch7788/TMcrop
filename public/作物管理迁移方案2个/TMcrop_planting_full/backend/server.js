const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api', routes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});
app.use(errorHandler);
app.listen(PORT, () => {
  console.log('[TM-Crop Backend] Server running on http://localhost:' + PORT);
});
module.exports = app;
