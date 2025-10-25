import mongoose from 'mongoose';
import { createLogger } from './logger.js';

const logger = createLogger('database');

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.warn('MONGODB_URI not found in environment variables, running without database');
    return;
  }

  try {
    logger.info('Connecting to MongoDB...');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('Successfully connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error);
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
