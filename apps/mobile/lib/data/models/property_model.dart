import 'cleaner_model.dart';

enum PropertyType { residential, commercial, vacation }

enum ContractType { longTerm, shortTerm }

class PropertyModel {
  final String id;
  final String title;
  final String description;
  final PropertyType type;
  final ContractType contractType;
  final double price;
  final double? areaSqm;
  final int? bedrooms;
  final int? bathrooms;
  final int? sleeps;
  final bool isFeatured;
  final LocationModel? location;
  final List<PropertyMediaModel> media;
  final List<AmenityModel> amenities;
  final List<CleanerModel> assignedCleaners;
  final String? icalUrl;
  final String? airbnbId;
  final String? airbnbUrl;
  final String? cin;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PropertyModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.contractType,
    required this.price,
    this.areaSqm,
    this.bedrooms,
    this.bathrooms,
    this.sleeps,
    this.isFeatured = false,
    this.location,
    this.media = const [],
    this.amenities = const [],
    this.assignedCleaners = const [],
    this.icalUrl,
    this.airbnbId,
    this.airbnbUrl,
    this.cin,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PropertyModel.fromJson(Map<String, dynamic> json) {
    return PropertyModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: _parsePropertyType(json['type'] as String),
      contractType: _parseContractType(json['contractType'] as String),
      price: (json['price'] as num).toDouble(),
      areaSqm: json['areaSqm'] != null ? (json['areaSqm'] as num).toDouble() : null,
      bedrooms: json['bedrooms'] as int?,
      bathrooms: json['bathrooms'] as int?,
      sleeps: json['sleeps'] as int?,
      isFeatured: json['isFeatured'] as bool? ?? false,
      location: json['location'] != null
          ? LocationModel.fromJson(json['location'] as Map<String, dynamic>)
          : null,
      media: (json['media'] as List<dynamic>?)
              ?.map((e) => PropertyMediaModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      amenities: (json['amenities'] as List<dynamic>?)
              ?.map((e) => AmenityModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      assignedCleaners: (json['assignedCleaners'] as List<dynamic>?)
              ?.map((e) => CleanerModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      icalUrl: json['icalUrl'] as String?,
      airbnbId: json['airbnbId'] as String?,
      airbnbUrl: json['airbnbUrl'] as String?,
      cin: json['cin'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static PropertyType _parsePropertyType(String type) {
    switch (type.toUpperCase()) {
      case 'RESIDENTIAL':
        return PropertyType.residential;
      case 'COMMERCIAL':
        return PropertyType.commercial;
      case 'VACATION':
        return PropertyType.vacation;
      default:
        return PropertyType.residential;
    }
  }

  static ContractType _parseContractType(String type) {
    switch (type.toUpperCase()) {
      case 'LONG_TERM':
        return ContractType.longTerm;
      case 'SHORT_TERM':
        return ContractType.shortTerm;
      default:
        return ContractType.shortTerm;
    }
  }

  String get coverImageUrl {
    if (media.isEmpty) return '';
    return media.first.url;
  }
}

class LocationModel {
  final String id;
  final String address;
  final String city;
  final String province;
  final String country;
  final double? lat;
  final double? lng;

  const LocationModel({
    required this.id,
    required this.address,
    required this.city,
    required this.province,
    required this.country,
    this.lat,
    this.lng,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      id: json['id'] as String,
      address: json['address'] as String,
      city: json['city'] as String,
      province: json['province'] as String,
      country: json['country'] as String,
      lat: json['lat'] != null ? (json['lat'] as num).toDouble() : null,
      lng: json['lng'] != null ? (json['lng'] as num).toDouble() : null,
    );
  }

  String get fullAddress => '$address, $city, $province';
}

class PropertyMediaModel {
  final String id;
  final String url;
  final String type;
  final String? alt;

  const PropertyMediaModel({
    required this.id,
    required this.url,
    required this.type,
    this.alt,
  });

  factory PropertyMediaModel.fromJson(Map<String, dynamic> json) {
    return PropertyMediaModel(
      id: json['id'] as String,
      url: json['url'] as String,
      type: json['type'] as String,
      alt: json['alt'] as String?,
    );
  }
}

class AmenityModel {
  final String id;
  final String name;

  const AmenityModel({
    required this.id,
    required this.name,
  });

  factory AmenityModel.fromJson(Map<String, dynamic> json) {
    return AmenityModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}
