import 'property_model.dart';
import 'user_model.dart';

enum CleaningStatus { pending, inProgress, completed, cancelled }

enum CleaningPhase { preCleaning, postCleaning }

enum PaymentStatus { pending, paid }

enum PhotoType { before, after }

class CleaningModel {
  final String id;
  final String propertyId;
  final String? bookingId;
  final String? cleanerId;
  final DateTime scheduledDate;
  final CleaningStatus status;
  final CleaningPhase phase;
  final PaymentStatus paymentStatus;
  final double paymentAmount;
  final String? notes;
  final List<CleaningPhotoModel> photos;
  final List<CleaningChecklistItem> checklist;
  final PropertyModel? property;
  final UserModel? cleaner;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CleaningModel({
    required this.id,
    required this.propertyId,
    this.bookingId,
    this.cleanerId,
    required this.scheduledDate,
    required this.status,
    required this.phase,
    required this.paymentStatus,
    required this.paymentAmount,
    this.notes,
    this.photos = const [],
    this.checklist = const [],
    this.property,
    this.cleaner,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CleaningModel.fromJson(Map<String, dynamic> json) {
    return CleaningModel(
      id: json['id'] as String,
      propertyId: json['propertyId'] as String,
      bookingId: json['bookingId'] as String?,
      cleanerId: json['cleanerId'] as String?,
      scheduledDate: DateTime.parse(json['scheduledDate'] as String),
      status: _parseStatus(json['status'] as String),
      phase: _parsePhase(json['phase'] as String? ?? 'POST_CLEANING'),
      paymentStatus: _parsePaymentStatus(json['paymentStatus'] as String),
      paymentAmount: (json['paymentAmount'] as num?)?.toDouble() ?? 50.0,
      notes: json['notes'] as String?,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => CleaningPhotoModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      checklist: (json['checklist'] as List<dynamic>?)
              ?.map((e) => CleaningChecklistItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      property: json['property'] != null
          ? PropertyModel.fromJson(json['property'] as Map<String, dynamic>)
          : null,
      cleaner: json['cleaner'] != null
          ? UserModel.fromJson(json['cleaner'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'propertyId': propertyId,
      'bookingId': bookingId,
      'cleanerId': cleanerId,
      'scheduledDate': scheduledDate.toIso8601String(),
      'status': status.name.toUpperCase(),
      'phase': phase == CleaningPhase.preCleaning ? 'PRE_CLEANING' : 'POST_CLEANING',
      'paymentStatus': paymentStatus.name.toUpperCase(),
      'paymentAmount': paymentAmount,
      'notes': notes,
    };
  }

  static CleaningStatus _parseStatus(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return CleaningStatus.pending;
      case 'IN_PROGRESS':
        return CleaningStatus.inProgress;
      case 'COMPLETED':
        return CleaningStatus.completed;
      case 'CANCELLED':
        return CleaningStatus.cancelled;
      default:
        return CleaningStatus.pending;
    }
  }

  static CleaningPhase _parsePhase(String phase) {
    switch (phase.toUpperCase()) {
      case 'PRE_CLEANING':
        return CleaningPhase.preCleaning;
      case 'POST_CLEANING':
        return CleaningPhase.postCleaning;
      default:
        return CleaningPhase.postCleaning;
    }
  }

  static PaymentStatus _parsePaymentStatus(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return PaymentStatus.pending;
      case 'PAID':
        return PaymentStatus.paid;
      default:
        return PaymentStatus.pending;
    }
  }

  CleaningModel copyWith({
    String? id,
    String? propertyId,
    String? bookingId,
    String? cleanerId,
    DateTime? scheduledDate,
    CleaningStatus? status,
    CleaningPhase? phase,
    PaymentStatus? paymentStatus,
    double? paymentAmount,
    String? notes,
    List<CleaningPhotoModel>? photos,
    List<CleaningChecklistItem>? checklist,
    PropertyModel? property,
    UserModel? cleaner,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CleaningModel(
      id: id ?? this.id,
      propertyId: propertyId ?? this.propertyId,
      bookingId: bookingId ?? this.bookingId,
      cleanerId: cleanerId ?? this.cleanerId,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      status: status ?? this.status,
      phase: phase ?? this.phase,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentAmount: paymentAmount ?? this.paymentAmount,
      notes: notes ?? this.notes,
      photos: photos ?? this.photos,
      checklist: checklist ?? this.checklist,
      property: property ?? this.property,
      cleaner: cleaner ?? this.cleaner,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  List<CleaningPhotoModel> get beforePhotos =>
      photos.where((p) => p.type == PhotoType.before).toList();

  List<CleaningPhotoModel> get afterPhotos =>
      photos.where((p) => p.type == PhotoType.after).toList();

  bool get hasBeforePhotos => beforePhotos.isNotEmpty;
  bool get hasAfterPhotos => afterPhotos.isNotEmpty;
}

class CleaningPhotoModel {
  final String id;
  final String cleaningId;
  final String url;
  final PhotoType type;
  final String? room;
  final DateTime createdAt;

  const CleaningPhotoModel({
    required this.id,
    required this.cleaningId,
    required this.url,
    required this.type,
    this.room,
    required this.createdAt,
  });

  factory CleaningPhotoModel.fromJson(Map<String, dynamic> json) {
    return CleaningPhotoModel(
      id: json['id'] as String,
      cleaningId: json['cleaningId'] as String,
      url: json['url'] as String,
      type: (json['type'] as String).toUpperCase() == 'BEFORE'
          ? PhotoType.before
          : PhotoType.after,
      room: json['room'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class CleaningChecklistItem {
  final String id;
  final String task;
  final bool completed;
  final String? room;

  const CleaningChecklistItem({
    required this.id,
    required this.task,
    this.completed = false,
    this.room,
  });

  factory CleaningChecklistItem.fromJson(Map<String, dynamic> json) {
    return CleaningChecklistItem(
      id: json['id'] as String,
      task: json['task'] as String,
      completed: json['completed'] as bool? ?? false,
      room: json['room'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task': task,
      'completed': completed,
      'room': room,
    };
  }

  CleaningChecklistItem copyWith({
    String? id,
    String? task,
    bool? completed,
    String? room,
  }) {
    return CleaningChecklistItem(
      id: id ?? this.id,
      task: task ?? this.task,
      completed: completed ?? this.completed,
      room: room ?? this.room,
    );
  }
}
