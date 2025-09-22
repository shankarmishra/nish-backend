// cleanupNotifications.js
import Notification from '../models/notification.model.js'; // Adjust the path as necessary
import cron from 'node-cron';

const disTitles = ['Order Update', 'Order Status Updated', 'Order Status Update'];

// Runs once a day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await Notification.deleteMany({
      status: 'resolved',
      title: { $in: disTitles },
      updatedAt: { $lte: oneWeekAgo }
    });

    console.log(`🗑️ Deleted ${result.deletedCount} old resolved notifications`);
  } catch (error) {
    console.error('Error cleaning notifications:', error);
  }
});
