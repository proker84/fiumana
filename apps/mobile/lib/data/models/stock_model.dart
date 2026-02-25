enum StockCategory {
  biancheria,
  pulizia,
  bagno,
  cucina,
  altro,
}

class StockItemModel {
  final String id;
  final String propertyId;
  final StockCategory category;
  final String name;
  final int quantity;
  final int minQuantity;
  final String? unit;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const StockItemModel({
    required this.id,
    required this.propertyId,
    required this.category,
    required this.name,
    required this.quantity,
    required this.minQuantity,
    this.unit,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory StockItemModel.fromJson(Map<String, dynamic> json) {
    return StockItemModel(
      id: json['id'] as String,
      propertyId: json['propertyId'] as String,
      category: _parseCategory(json['category'] as String),
      name: json['name'] as String,
      quantity: json['quantity'] as int,
      minQuantity: json['minQuantity'] as int,
      unit: json['unit'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'propertyId': propertyId,
      'category': category.name.toUpperCase(),
      'name': name,
      'quantity': quantity,
      'minQuantity': minQuantity,
      'unit': unit,
      'notes': notes,
    };
  }

  static StockCategory _parseCategory(String category) {
    switch (category.toUpperCase()) {
      case 'BIANCHERIA':
        return StockCategory.biancheria;
      case 'PULIZIA':
        return StockCategory.pulizia;
      case 'BAGNO':
        return StockCategory.bagno;
      case 'CUCINA':
        return StockCategory.cucina;
      default:
        return StockCategory.altro;
    }
  }

  bool get isLowStock => quantity < minQuantity;
  bool get isOutOfStock => quantity == 0;

  StockItemModel copyWith({
    String? id,
    String? propertyId,
    StockCategory? category,
    String? name,
    int? quantity,
    int? minQuantity,
    String? unit,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return StockItemModel(
      id: id ?? this.id,
      propertyId: propertyId ?? this.propertyId,
      category: category ?? this.category,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      minQuantity: minQuantity ?? this.minQuantity,
      unit: unit ?? this.unit,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  String get categoryDisplayName {
    switch (category) {
      case StockCategory.biancheria:
        return 'Biancheria';
      case StockCategory.pulizia:
        return 'Prodotti Pulizia';
      case StockCategory.bagno:
        return 'Bagno';
      case StockCategory.cucina:
        return 'Cucina';
      case StockCategory.altro:
        return 'Altro';
    }
  }
}

class StockMovementModel {
  final String id;
  final String stockItemId;
  final int quantityChange;
  final String reason;
  final String? userId;
  final DateTime createdAt;

  const StockMovementModel({
    required this.id,
    required this.stockItemId,
    required this.quantityChange,
    required this.reason,
    this.userId,
    required this.createdAt,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> json) {
    return StockMovementModel(
      id: json['id'] as String,
      stockItemId: json['stockItemId'] as String,
      quantityChange: json['quantityChange'] as int,
      reason: json['reason'] as String,
      userId: json['userId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'stockItemId': stockItemId,
      'quantityChange': quantityChange,
      'reason': reason,
      'userId': userId,
    };
  }
}
