import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  aiModel?: string;
  editMode?: 'full' | 'patch';
  tokenCount?: number;
  metadata?: Record<string, any>;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    aiModel: {
      type: String,
    },
    editMode: {
      type: String,
      enum: ['full', 'patch'],
    },
    tokenCount: {
      type: Number,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'chat_messages',
  }
);

// Indexes for faster queries
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
