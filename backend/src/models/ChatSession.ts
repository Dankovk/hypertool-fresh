import mongoose, { Schema, Document } from 'mongoose';

export interface IChatSession extends Document {
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  aiModel: string;
  metadata?: Record<string, any>;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    title: {
      type: String,
      required: true,
      default: 'New Chat',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    aiModel: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'chat_sessions',
  }
);

// Index for faster queries
ChatSessionSchema.index({ updatedAt: -1 });
ChatSessionSchema.index({ createdAt: -1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
