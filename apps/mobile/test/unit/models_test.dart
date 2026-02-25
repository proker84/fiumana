import 'package:flutter_test/flutter_test.dart';
import 'package:fiumana_mobile/data/models/user_model.dart';
import 'package:fiumana_mobile/data/models/cleaning_model.dart';
import 'package:fiumana_mobile/data/models/booking_model.dart';
import 'package:fiumana_mobile/data/models/payment_model.dart' as payment;
import 'package:fiumana_mobile/data/models/stock_model.dart';

void main() {
  group('UserModel', () {
    test('fromJson creates correct model', () {
      final json = {
        'id': 'user-123',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'ADMIN',
      };

      final user = UserModel.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'test@example.com');
      expect(user.name, 'Test User');
      expect(user.role, UserRole.admin);
    });

    test('toJson returns correct map', () {
      final user = UserModel(
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.cleaner,
      );

      final json = user.toJson();

      expect(json['id'], 'user-123');
      expect(json['email'], 'test@example.com');
      expect(json['role'], 'CLEANER');
    });

    test('role is correctly set for different roles', () {
      final admin = UserModel(
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: UserRole.admin,
      );

      final cleaner = UserModel(
        id: '2',
        email: 'cleaner@test.com',
        name: 'Cleaner',
        role: UserRole.cleaner,
      );

      final guest = UserModel(
        id: '3',
        email: 'guest@test.com',
        name: 'Guest',
        role: UserRole.guest,
      );

      expect(admin.role, UserRole.admin);
      expect(cleaner.role, UserRole.cleaner);
      expect(guest.role, UserRole.guest);
    });
  });

  group('CleaningModel', () {
    test('fromJson creates correct model', () {
      final json = {
        'id': 'clean-123',
        'propertyId': 'prop-456',
        'cleanerId': 'user-789',
        'scheduledDate': '2024-03-15T10:00:00.000Z',
        'status': 'PENDING',
        'phase': 'POST_CLEANING',
        'paymentStatus': 'PENDING',
        'paymentAmount': 50.0,
        'createdAt': '2024-03-01T00:00:00.000Z',
        'updatedAt': '2024-03-01T00:00:00.000Z',
      };

      final cleaning = CleaningModel.fromJson(json);

      expect(cleaning.id, 'clean-123');
      expect(cleaning.propertyId, 'prop-456');
      expect(cleaning.status, CleaningStatus.pending);
      expect(cleaning.phase, CleaningPhase.postCleaning);
      expect(cleaning.paymentAmount, 50.0);
    });

    test('status parsing handles IN_PROGRESS correctly', () {
      final json = {
        'id': 'clean-123',
        'propertyId': 'prop-456',
        'scheduledDate': '2024-03-15T10:00:00.000Z',
        'status': 'IN_PROGRESS',
        'phase': 'POST_CLEANING',
        'paymentStatus': 'PENDING',
        'createdAt': '2024-03-01T00:00:00.000Z',
        'updatedAt': '2024-03-01T00:00:00.000Z',
      };

      final cleaning = CleaningModel.fromJson(json);
      expect(cleaning.status, CleaningStatus.inProgress);
    });
  });

  group('BookingModel', () {
    test('fromJson creates correct model', () {
      final json = {
        'id': 'book-123',
        'propertyId': 'prop-456',
        'source': 'AIRBNB',
        'checkInDate': '2024-03-15T14:00:00.000Z',
        'checkOutDate': '2024-03-18T10:00:00.000Z',
        'guestCount': 2,
        'guestName': 'Mario Rossi',
        'createdAt': '2024-03-01T00:00:00.000Z',
        'updatedAt': '2024-03-01T00:00:00.000Z',
      };

      final booking = BookingModel.fromJson(json);

      expect(booking.id, 'book-123');
      expect(booking.source, BookingSource.airbnb);
      expect(booking.guestCount, 2);
      expect(booking.guestName, 'Mario Rossi');
    });

    test('nights calculates correctly', () {
      final booking = BookingModel(
        id: 'book-123',
        propertyId: 'prop-456',
        source: BookingSource.direct,
        checkInDate: DateTime(2024, 3, 15),
        checkOutDate: DateTime(2024, 3, 18),
        guestCount: 2,
        guestName: 'Test Guest',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(booking.nights, 3);
    });

    test('sourceDisplayName returns correct Italian name', () {
      final airbnbBooking = BookingModel(
        id: '1',
        propertyId: '1',
        source: BookingSource.airbnb,
        checkInDate: DateTime.now(),
        checkOutDate: DateTime.now(),
        guestCount: 1,
        guestName: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(airbnbBooking.sourceDisplayName, 'Airbnb');
    });
  });

  group('PaymentModel', () {
    test('fromJson creates correct model', () {
      final json = {
        'id': 'pay-123',
        'cleaningId': 'clean-456',
        'cleanerName': 'Mario Rossi',
        'cleanerEmail': 'mario@test.com',
        'propertyName': 'Villa Test',
        'scheduledDate': '2024-03-15T10:00:00.000Z',
        'amount': 50.0,
        'status': 'PENDING',
      };

      final paymentModel = payment.PaymentModel.fromJson(json);

      expect(paymentModel.id, 'pay-123');
      expect(paymentModel.cleanerName, 'Mario Rossi');
      expect(paymentModel.amount, 50.0);
      expect(paymentModel.status, payment.PaymentStatus.pending);
      expect(paymentModel.isPending, true);
      expect(paymentModel.isPaid, false);
    });

    test('formattedAmount returns correct format', () {
      final paymentModel = payment.PaymentModel(
        id: '1',
        cleaningId: '1',
        cleanerName: 'Test',
        cleanerEmail: 'test@test.com',
        propertyName: 'Test Property',
        scheduledDate: DateTime.now(),
        amount: 50.0,
        status: payment.PaymentStatus.pending,
      );

      expect(paymentModel.formattedAmount, '€50.00');
    });
  });

  group('StockItemModel', () {
    test('fromJson creates correct model', () {
      final json = {
        'id': 'stock-123',
        'propertyId': 'prop-456',
        'category': 'BIANCHERIA',
        'name': 'Lenzuola matrimoniali',
        'quantity': 10,
        'minQuantity': 5,
        'createdAt': '2024-03-01T00:00:00.000Z',
        'updatedAt': '2024-03-01T00:00:00.000Z',
      };

      final item = StockItemModel.fromJson(json);

      expect(item.id, 'stock-123');
      expect(item.category, StockCategory.biancheria);
      expect(item.quantity, 10);
      expect(item.minQuantity, 5);
      expect(item.isLowStock, false);
    });

    test('isLowStock returns true when below threshold', () {
      final item = StockItemModel(
        id: '1',
        propertyId: '1',
        category: StockCategory.pulizia,
        name: 'Detersivo',
        quantity: 3,
        minQuantity: 5,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(item.isLowStock, true);
      expect(item.isOutOfStock, false);
    });

    test('isOutOfStock returns true when quantity is zero', () {
      final item = StockItemModel(
        id: '1',
        propertyId: '1',
        category: StockCategory.bagno,
        name: 'Sapone',
        quantity: 0,
        minQuantity: 5,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(item.isOutOfStock, true);
      expect(item.isLowStock, true);
    });
  });

  group('PaymentSummary', () {
    test('fromJson creates correct summary', () {
      final json = {
        'totalPending': 5,
        'totalPaid': 10,
        'amountPending': 250.0,
        'amountPaid': 500.0,
        'byMonth': [],
        'byCleaner': [],
      };

      final summary = payment.PaymentSummary.fromJson(json);

      expect(summary.totalPending, 5);
      expect(summary.totalPaid, 10);
      expect(summary.total, 15);
      expect(summary.totalAmount, 750.0);
      expect(summary.formattedTotal, '€750.00');
    });
  });
}
