// lib/l10n/app_localizations.dart
// Localisation — EN + Kinyarwanda — NFR-013
import 'package:flutter/material.dart';

class AppLocalizations {
  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();
  static AppLocalizations? of(BuildContext context) => Localizations.of<AppLocalizations>(context, AppLocalizations);
  final Locale locale;
  AppLocalizations(this.locale);

  bool get isKinyarwanda => locale.languageCode == 'rw';

  String get appTitle        => isKinyarwanda ? 'Irerero' : 'Irerero';
  String get takeAttendance  => isKinyarwanda ? 'Ibarura' : 'Take Attendance';
  String get recordMeasurement => isKinyarwanda ? 'Bapima' : 'Record Measurement';
  String get viewAlerts      => isKinyarwanda ? 'Iburira' : 'View Alerts';
  String get children        => isKinyarwanda ? 'Abana' : 'Children';
  String get syncing         => isKinyarwanda ? 'Birasuzumwa...' : 'Syncing...';
  String get allSynced       => isKinyarwanda ? 'Byose bisuzumwe' : 'All synced';
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();
  @override bool isSupported(Locale locale) => ['rw', 'en'].contains(locale.languageCode);
  @override Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);
  @override bool shouldReload(_AppLocalizationsDelegate old) => false;
}
