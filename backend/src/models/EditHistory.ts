import mongoose, { Schema, Document } from 'mongoose';

export interface IEdit {
  type: 'search-replace' | 'unified-diff';
  filePath: string;
  search?: string;
  replace?: string;
  diff?: string;
  context?: string;
}

export interface IEditHistory extends Document {
  sessionId?: mongoose.Types.ObjectId;
  entryId: string;
  timestamp: number;
  explanation?: string;
  edits: IEdit[];
  beforeState: Record<string, string>;
  afterState: Record<string, string>;
  createdAt: Date;
}

const EditSchema = new Schema<IEdit>(
  {
    type: {
      type: String,
      enum: ['search-replace', 'unified-diff'],
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    search: String,
    replace: String,
    diff: String,
    context: String,
  },
  { _id: false }
);

const EditHistorySchema = new Schema<IEditHistory>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      index: true,
    },
    entryId: {
      type: String,
      required: true,
      unique: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    explanation: String,
    edits: [EditSchema],
    beforeState: {
      type: Schema.Types.Mixed,
      required: true,
    },
    afterState: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'edit_history',
  }
);

// Indexes
EditHistorySchema.index({ timestamp: -1 });
EditHistorySchema.index({ sessionId: 1, timestamp: -1 });

export const EditHistory = mongoose.model<IEditHistory>('EditHistory', EditHistorySchema);
