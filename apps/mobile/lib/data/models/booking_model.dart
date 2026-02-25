import 'property_model.dart';
import 'cleaning_model.dart';

enum BookingSource { airbnb, booking, direct, other }

class BookingModel {
  final String id;
  final String propertyId;
  final String? guestId;
  final String? externalId;
  final BookingSource source;
  final DateTime checkInDate;
  final DateTime checkOutDate;
  final int guestCount;
  final String guestName;
  final String? guestEmail;
  final String? guestPhone;
  final bool checkInCompleted;
  final bool alloggiatiSent;
  final String? notes;
  final PropertyModel? property;
  final CleaningModel? cleaning;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BookingModel({
    required this.id,
    required this.propertyId,
    this.guestId,
    this.externalId,
    required this.source,
    required this.checkInDate,
    required this.checkOutDate,
    required this.guestCount,
    required this.guestName,
    this.guestEmail,
    this.guestPhone,
    this.checkInCompleted = false,
    this.alloggiatiSent = false,
    this.notes,
    this.property,
    this.cleaning,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] as String,
      propertyId: json['propertyId'] as String,
      guestId: json['guestId'] as String?,
      externalId: json['externalId'] as String?,
      source: _parseSource(json['source'] as String),
      checkInDate: DateTime.parse(json['checkInDate'] as String),
      checkOutDate: DateTime.parse(json['checkOutDate'] as String),
      guestCount: json['guestCount'] as int,
      guestName: json['guestName'] as String,
      guestEmail: json['guestEmail'] as String?,
      guestPhone: json['guestPhone'] as String?,
      checkInCompleted: json['checkInCompleted'] as bool? ?? false,
      alloggiatiSent: json['alloggiatiSent'] as bool? ?? false,
      notes: json['notes'] as String?,
      property: json['property'] != null
          ? PropertyModel.fromJson(json['property'] as Map<String, dynamic>)
          : null,
      cleaning: json['cleaning'] != null
          ? CleaningModel.fromJson(json['cleaning'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'propertyId': propertyId,
      'guestId': guestId,
      'externalId': externalId,
      'source': source.name.toUpperCase(),
      'checkInDate': checkInDate.toIso8601String(),
      'checkOutDate': checkOutDate.toIso8601String(),
      'guestCount': guestCount,
      'guestName': guestName,
      'guestEmail': guestEmail,
      'guestPhone': guestPhone,
      'checkInCompleted': checkInCompleted,
      'alloggiatiSent': alloggiatiSent,
      'notes': notes,
    };
  }

  static BookingSource _parseSource(String source) {
    switch (source.toUpperCase()) {
      case 'AIRBNB':
        return BookingSource.airbnb;
      case 'BOOKING':
        return BookingSource.booking;
      case 'DIRECT':
        return BookingSource.direct;
      default:
        return BookingSource.other;
    }
  }

  int get nights => checkOutDate.difference(checkInDate).inDays;

  bool get isActive {
    final now = DateTime.now();
    return now.isAfter(checkInDate) && now.isBefore(checkOutDate);
  }

  bool get isUpcoming => DateTime.now().isBefore(checkInDate);
  bool get isPast => DateTime.now().isAfter(checkOutDate);

  String get sourceDisplayName {
    switch (source) {
      case BookingSource.airbnb:
        return 'Airbnb';
      case BookingSource.booking:
        return 'Booking.com';
      case BookingSource.direct:
        return 'Prenotazione Diretta';
      case BookingSource.other:
        return 'Altro';
    }
  }

  BookingModel copyWith({
    String? id,
    String? propertyId,
    String? guestId,
    String? externalId,
    BookingSource? source,
    DateTime? checkInDate,
    DateTime? checkOutDate,
    int? guestCount,
    String? guestName,
    String? guestEmail,
    String? guestPhone,
    bool? checkInCompleted,
    bool? alloggiatiSent,
    String? notes,
    PropertyModel? property,
    CleaningModel? cleaning,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BookingModel(
      id: id ?? this.id,
      propertyId: propertyId ?? this.propertyId,
      guestId: guestId ?? this.guestId,
      externalId: externalId ?? this.externalId,
      source: source ?? this.source,
      checkInDate: checkInDate ?? this.checkInDate,
      checkOutDate: checkOutDate ?? this.checkOutDate,
      guestCount: guestCount ?? this.guestCount,
      guestName: guestName ?? this.guestName,
      guestEmail: guestEmail ?? this.guestEmail,
      guestPhone: guestPhone ?? this.guestPhone,
      checkInCompleted: checkInCompleted ?? this.checkInCompleted,
      alloggiatiSent: alloggiatiSent ?? this.alloggiatiSent,
      notes: notes ?? this.notes,
      property: property ?? this.property,
      cleaning: cleaning ?? this.cleaning,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
