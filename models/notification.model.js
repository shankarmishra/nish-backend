import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema({
  // Recipient information
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['user', 'producer', 'platform'],
    default: 'user'
  },

  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderType: {
    type: String,
    required: true,
    enum: ['system', 'producer', 'platform', 'admin'],
    default: 'system'
  },

  // Notification content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  notificationType: {
    type: String,
    required: true,
    enum: ['alert', 'promo', 'update', 'remark','security', 'message', 'transaction'],
    default: 'alert'
  },
  
  // Additional data payload
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'resolved', 'dismissed', 'archived'],
    default: 'active'
  },
  read: {
    type: Boolean,
    default: false
  },
  clicked: {
    type: Boolean,
    default: false
  },
  clickedAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true
});
export default mongoose.model('Notification', NotificationSchema);