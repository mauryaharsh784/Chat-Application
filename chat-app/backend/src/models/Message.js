const mongoose = require('mongoose');

const MAX_USERNAME_LENGTH = Number(process.env.MAX_USERNAME_LENGTH) || 30;
const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH) || 1000;

const messageSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [1, 'Username cannot be empty'],
      maxlength: [
        MAX_USERNAME_LENGTH,
        `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`,
      ],
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [
        MAX_MESSAGE_LENGTH,
        `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    // We manage `timestamp` ourselves (server-generated), but keep
    // createdAt/updatedAt too since they're useful and cheap.
    timestamps: true,
    versionKey: false,
  }
);

messageSchema.index({ timestamp: 1 });

// Never let raw HTML/script content be trusted; the frontend also renders
// message text as plain text (not dangerouslySetInnerHTML), so this is
// defense in depth rather than the only safeguard.
messageSchema.pre('validate', function stripControlChars(next) {
  if (typeof this.message === 'string') {
    // eslint-disable-next-line no-control-regex
    this.message = this.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
