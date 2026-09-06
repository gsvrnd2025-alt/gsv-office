class FileItem {
  final String id;
  final String name;
  final String? originalName;
  final int size;
  final String mimeType;
  final String? path;
  final String? url;
  final String? folderId;
  final bool isFolder;
  final String uploaderId;
  final String? uploaderName;
  final DateTime createdAt;
  final DateTime? updatedAt;

  FileItem({
    required this.id,
    required this.name,
    this.originalName,
    required this.size,
    required this.mimeType,
    this.path,
    this.url,
    this.folderId,
    this.isFolder = false,
    required this.uploaderId,
    this.uploaderName,
    required this.createdAt,
    this.updatedAt,
  });

  factory FileItem.fromJson(Map<String, dynamic> json) {
    return FileItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? json['originalName'] ?? 'Untitled',
      originalName: json['originalName'],
      size: json['size'] is int ? json['size'] : int.tryParse(json['size']?.toString() ?? '0') ?? 0,
      mimeType: json['mimeType'] ?? 'application/octet-stream',
      path: json['path'],
      url: json['url'],
      folderId: json['folderId']?.toString(),
      isFolder: json['isFolder'] == true || json['mimeType'] == 'folder',
      uploaderId: json['uploaderId']?.toString() ?? json['userId']?.toString() ?? '',
      uploaderName: json['uploader']?['name'] ?? json['uploaderName'],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }

  String get formattedSize {
    if (isFolder) return '--';
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}

class StorageInfo {
  final int usedBytes;
  final int totalBytes;
  final int fileCount;
  final int folderCount;

  StorageInfo({
    required this.usedBytes,
    required this.totalBytes,
    required this.fileCount,
    required this.folderCount,
  });

  factory StorageInfo.fromJson(Map<String, dynamic> json) {
    return StorageInfo(
      usedBytes: json['usedBytes'] ?? 0,
      totalBytes: json['totalBytes'] ?? 100 * 1024 * 1024 * 1024, // 100 GB default
      fileCount: json['fileCount'] ?? 0,
      folderCount: json['folderCount'] ?? 0,
    );
  }

  double get usedPercentage => totalBytes > 0 ? (usedBytes / totalBytes).clamp(0.0, 1.0) : 0.0;
  String get formattedUsed => FileItem(id: '', name: '', size: usedBytes, mimeType: '', uploaderId: '', createdAt: DateTime.now()).formattedSize;
  String get formattedTotal => FileItem(id: '', name: '', size: totalBytes, mimeType: '', uploaderId: '', createdAt: DateTime.now()).formattedSize;
}
