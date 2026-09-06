import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppStyles {
  // Typography
  static TextStyle heading1({bool isDark = true, Color? color}) => GoogleFonts.spaceGrotesk(
    fontSize: 28,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.5,
    color: color ?? (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
  );

  static TextStyle heading2({bool isDark = true, Color? color}) => GoogleFonts.spaceGrotesk(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    color: color ?? (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
  );

  static TextStyle heading3({bool isDark = true, Color? color}) => GoogleFonts.inter(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: color ?? (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
  );

  static TextStyle bodyLarge({bool isDark = true, Color? color}) => GoogleFonts.inter(
    fontSize: 15,
    fontWeight: FontWeight.w500,
    color: color ?? (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
  );

  static TextStyle bodyMedium({bool isDark = true, Color? color}) => GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: color ?? (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
  );

  static TextStyle bodySmall({bool isDark = true, Color? color}) => GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: color ?? (isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
  );

  static TextStyle buttonText({Color color = Colors.white}) => GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.2,
    color: color,
  );

  // Glassmorphic / Card Decorations
  static BoxDecoration cardDecoration({
    bool isDark = true,
    double radius = 16,
    Color? borderColor,
    bool isHovered = false,
  }) {
    return BoxDecoration(
      color: isDark
          ? (isHovered ? AppColors.darkCardHover : AppColors.darkCard.withValues(alpha: 0.85))
          : (isHovered ? AppColors.lightCardHover : AppColors.lightCard),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: borderColor ?? (isDark ? AppColors.darkBorder.withValues(alpha: 0.6) : AppColors.lightBorder),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: isDark ? Colors.black.withValues(alpha: 0.35) : Colors.black.withValues(alpha: 0.04),
          blurRadius: isHovered ? 16 : 8,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  static BoxDecoration primaryButtonDecoration({double radius = 10}) {
    return BoxDecoration(
      gradient: AppColors.primaryGradient,
      borderRadius: BorderRadius.circular(radius),
      boxShadow: [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.35),
          blurRadius: 10,
          offset: const Offset(0, 3),
        ),
      ],
    );
  }
}
