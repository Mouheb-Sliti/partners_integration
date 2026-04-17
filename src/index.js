const app = require('./app');
const config = require('./config');
const connectDB = require('./db');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Partners Integration service running on port ${config.port}`);
  });
}

start();
