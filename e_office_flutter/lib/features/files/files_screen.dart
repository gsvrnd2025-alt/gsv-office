import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';
import '../../core/state/file_provider.dart';

class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FileProvider>().fetchFiles();
    });
  }

  void _handleUpload() async {
    final result = await FilePicker.pickFiles();
    if (result != null && result.files.isNotEmpty) {
      final picked = result.files.first;
      if (picked.path != null && mounted) {
        final success = await context.read<FileProvider>().uploadFile(
          filePath: picked.path!,
          fileName: picked.name,
        );
        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Uploaded ${picked.name} to TrueNAS Storage Pool')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final fileProv = context.watch<FileProvider>();
    final storage = fileProv.storageInfo;

    final filteredFiles = fileProv.files.where((f) {
      if (_searchQuery.isEmpty) return true;
      return f.name.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & Upload Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Enterprise File Storage', style: AppStyles.heading1(isDark: isDark)),
                  const SizedBox(height: 4),
                  Text('TrueNAS ZFS Storage Pool • MinIO S3 Synchronized', style: AppStyles.bodyMedium(isDark: isDark)),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.cloud_upload_rounded, size: 18),
                label: const Text('Upload File'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _handleUpload,
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Storage Usage Gauge Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.pie_chart_outline_rounded, color: AppColors.primaryLight, size: 20),
                        const SizedBox(width: 8),
                        Text('Storage Quota', style: AppStyles.heading3(isDark: isDark)),
                      ],
                    ),
                    Text(
                      '${storage.formattedUsed} of ${storage.formattedTotal} used (${(storage.usedPercentage * 100).toStringAsFixed(1)}%)',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: storage.usedPercentage.clamp(0.02, 1.0),
                    minHeight: 10,
                    backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightBorder,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildStorageLegend('Documents', '4.2 GB', AppColors.primary, isDark),
                    const SizedBox(width: 16),
                    _buildStorageLegend('Images & Media', '7.8 GB', AppColors.cyan, isDark),
                    const SizedBox(width: 16),
                    _buildStorageLegend('Binaries & APKs', '2.2 GB', AppColors.emerald, isDark),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Search Bar
          TextField(
            onChanged: (v) => setState(() => _searchQuery = v),
            decoration: InputDecoration(
              hintText: 'Search files and folders...',
              prefixIcon: const Icon(Icons.search_rounded, size: 18),
              filled: true,
              fillColor: isDark ? AppColors.darkCard : Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),

          const SizedBox(height: 16),

          // Files Table
          Container(
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredFiles.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? AppColors.darkBorder.withValues(alpha: 0.4) : AppColors.lightBorder),
              itemBuilder: (context, i) {
                final file = filteredFiles[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: file.isFolder ? AppColors.amber.withValues(alpha: 0.15) : AppColors.primary.withValues(alpha: 0.15),
                    child: Icon(
                      file.isFolder ? Icons.folder_rounded : Icons.insert_drive_file_rounded,
                      color: file.isFolder ? AppColors.amber : AppColors.primary,
                      size: 20,
                    ),
                  ),
                  title: Text(file.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(
                    '${file.formattedSize} • ${DateFormat('dd MMM yyyy, hh:mm a').format(file.createdAt)}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.download_rounded, size: 18),
                        tooltip: 'Download',
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Downloading ${file.name} from TrueNAS server... 📥')),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.share_rounded, size: 18),
                        tooltip: 'Share',
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Sharing ${file.name} link copied')),
                          );
                        },
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStorageLegend(String label, String size, Color color, bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text('$label ($size)', style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary)),
      ],
    );
  }
}
