import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccount) {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT not configured - push notifications disabled');
        return;
      }

      const parsedAccount = JSON.parse(serviceAccount);

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(parsedAccount),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendToDevice(
    fcmToken: string,
    payload: PushNotificationPayload,
  ): Promise<NotificationResult> {
    if (!this.firebaseApp) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'fiumana_default',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return { success: false, error: error.message };
    }
  }

  async sendToMultipleDevices(
    fcmTokens: string[],
    payload: PushNotificationPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.firebaseApp || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error('Failed to send multicast push notification', error);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  // Notification templates
  async sendNewCleaningAssigned(
    fcmToken: string,
    propertyName: string,
    scheduledDate: Date,
  ): Promise<NotificationResult> {
    const formattedDate = scheduledDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return this.sendToDevice(fcmToken, {
      title: 'Nuova pulizia assegnata',
      body: `Hai una nuova pulizia da effettuare presso ${propertyName} il ${formattedDate}`,
      data: {
        type: 'NEW_CLEANING',
        propertyName,
        scheduledDate: scheduledDate.toISOString(),
      },
    });
  }

  async sendCleaningReminder(
    fcmToken: string,
    propertyName: string,
    scheduledDate: Date,
  ): Promise<NotificationResult> {
    return this.sendToDevice(fcmToken, {
      title: 'Promemoria pulizia',
      body: `Ricorda: pulizia programmata oggi presso ${propertyName}`,
      data: {
        type: 'CLEANING_REMINDER',
        propertyName,
        scheduledDate: scheduledDate.toISOString(),
      },
    });
  }

  async sendLowStockAlert(
    fcmToken: string,
    itemName: string,
    propertyName: string,
    currentQuantity: number,
  ): Promise<NotificationResult> {
    return this.sendToDevice(fcmToken, {
      title: 'Scorte in esaurimento',
      body: `${itemName} presso ${propertyName}: solo ${currentQuantity} rimasti`,
      data: {
        type: 'LOW_STOCK',
        itemName,
        propertyName,
        currentQuantity: currentQuantity.toString(),
      },
    });
  }

  async sendCheckInCompleted(
    fcmToken: string,
    guestName: string,
    propertyName: string,
  ): Promise<NotificationResult> {
    return this.sendToDevice(fcmToken, {
      title: 'Check-in completato',
      body: `${guestName} ha completato il check-in per ${propertyName}`,
      data: {
        type: 'CHECKIN_COMPLETED',
        guestName,
        propertyName,
      },
    });
  }

  async sendCleaningCompleted(
    fcmToken: string,
    propertyName: string,
    cleanerName: string,
  ): Promise<NotificationResult> {
    return this.sendToDevice(fcmToken, {
      title: 'Pulizia completata',
      body: `${cleanerName} ha completato la pulizia di ${propertyName}`,
      data: {
        type: 'CLEANING_COMPLETED',
        propertyName,
        cleanerName,
      },
    });
  }
}
