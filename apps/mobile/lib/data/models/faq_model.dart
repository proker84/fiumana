enum FaqCategory {
  checkin,
  checkout,
  wifi,
  parking,
  amenities,
  rules,
  emergency,
  other,
}

class FaqModel {
  final String id;
  final String propertyId;
  final String question;
  final String answer;
  final FaqCategory category;
  final String? videoUrl;
  final String? audioUrl;
  final List<String> imageUrls;
  final int sortOrder;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FaqModel({
    required this.id,
    required this.propertyId,
    required this.question,
    required this.answer,
    required this.category,
    this.videoUrl,
    this.audioUrl,
    this.imageUrls = const [],
    this.sortOrder = 0,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FaqModel.fromJson(Map<String, dynamic> json) {
    return FaqModel(
      id: json['id'] as String,
      propertyId: json['propertyId'] as String,
      question: json['question'] as String,
      answer: json['answer'] as String,
      category: _parseCategory(json['category'] as String),
      videoUrl: json['videoUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      imageUrls: (json['imageUrls'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      sortOrder: json['sortOrder'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'propertyId': propertyId,
      'question': question,
      'answer': answer,
      'category': category.name.toUpperCase(),
      'videoUrl': videoUrl,
      'audioUrl': audioUrl,
      'imageUrls': imageUrls,
      'sortOrder': sortOrder,
      'isActive': isActive,
    };
  }

  static FaqCategory _parseCategory(String category) {
    switch (category.toUpperCase()) {
      case 'CHECKIN':
        return FaqCategory.checkin;
      case 'CHECKOUT':
        return FaqCategory.checkout;
      case 'WIFI':
        return FaqCategory.wifi;
      case 'PARKING':
        return FaqCategory.parking;
      case 'AMENITIES':
        return FaqCategory.amenities;
      case 'RULES':
        return FaqCategory.rules;
      case 'EMERGENCY':
        return FaqCategory.emergency;
      default:
        return FaqCategory.other;
    }
  }

  bool get hasVideo => videoUrl != null && videoUrl!.isNotEmpty;
  bool get hasAudio => audioUrl != null && audioUrl!.isNotEmpty;
  bool get hasImages => imageUrls.isNotEmpty;
  bool get hasMedia => hasVideo || hasAudio || hasImages;

  String get categoryDisplayName {
    switch (category) {
      case FaqCategory.checkin:
        return 'Check-in';
      case FaqCategory.checkout:
        return 'Check-out';
      case FaqCategory.wifi:
        return 'WiFi';
      case FaqCategory.parking:
        return 'Parcheggio';
      case FaqCategory.amenities:
        return 'Servizi';
      case FaqCategory.rules:
        return 'Regole';
      case FaqCategory.emergency:
        return 'Emergenze';
      case FaqCategory.other:
        return 'Altro';
    }
  }

  String get categoryIcon {
    switch (category) {
      case FaqCategory.checkin:
        return 'login';
      case FaqCategory.checkout:
        return 'logout';
      case FaqCategory.wifi:
        return 'wifi';
      case FaqCategory.parking:
        return 'local_parking';
      case FaqCategory.amenities:
        return 'room_service';
      case FaqCategory.rules:
        return 'gavel';
      case FaqCategory.emergency:
        return 'emergency';
      case FaqCategory.other:
        return 'help_outline';
    }
  }

  FaqModel copyWith({
    String? id,
    String? propertyId,
    String? question,
    String? answer,
    FaqCategory? category,
    String? videoUrl,
    String? audioUrl,
    List<String>? imageUrls,
    int? sortOrder,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FaqModel(
      id: id ?? this.id,
      propertyId: propertyId ?? this.propertyId,
      question: question ?? this.question,
      answer: answer ?? this.answer,
      category: category ?? this.category,
      videoUrl: videoUrl ?? this.videoUrl,
      audioUrl: audioUrl ?? this.audioUrl,
      imageUrls: imageUrls ?? this.imageUrls,
      sortOrder: sortOrder ?? this.sortOrder,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
