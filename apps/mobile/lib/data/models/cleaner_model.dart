class CleanerModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final List<AssignedPropertySummary>? assignedProperties;

  const CleanerModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.assignedProperties,
  });

  factory CleanerModel.fromJson(Map<String, dynamic> json) {
    return CleanerModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      assignedProperties: (json['assignedProperties'] as List<dynamic>?)
          ?.map((e) => AssignedPropertySummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'phone': phone,
  };
}

class AssignedPropertySummary {
  final String id;
  final String title;

  const AssignedPropertySummary({
    required this.id,
    required this.title,
  });

  factory AssignedPropertySummary.fromJson(Map<String, dynamic> json) {
    return AssignedPropertySummary(
      id: json['id'] as String,
      title: json['title'] as String,
    );
  }
}
