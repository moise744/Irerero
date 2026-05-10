// lib/main.dart
//
// Irerero Mobile App — Entry point
// Flutter 3.x, Android 8.0+, Material Design 3 (Material You)
// SRS §5.1: "shall follow Google Material Design 3 (Material You) guidelines"
// NFR-013: Default language is Kinyarwanda

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:workmanager/workmanager.dart';
import 'package:google_fonts/google_fonts.dart';

import 'db/database_helper.dart';
import 'services/auth_service.dart';
import 'services/notification_service.dart';
import 'sync/sync_service.dart';
import 'l10n/app_localizations.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';

// Workmanager task name for background sync — FR-089
const String kBackgroundSyncTask = 'irerero_background_sync';

/// Background sync callback — runs even when app is closed
@pragma('vm:entry-point')
void callbackDispatcher() {
  WidgetsFlutterBinding.ensureInitialized();
  Workmanager().executeTask((task, inputData) async {
    if (task == kBackgroundSyncTask) {
      await DatabaseHelper.instance.init();
      final auth = AuthService();
      await auth.restoreSession();
      if (auth.isLoggedIn) {
        final syncService = SyncService();
        await syncService.sync(auth);
      }
    }
    return true;
  });
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await DatabaseHelper.instance.init();
  await NotificationService().init();

  final authService = AuthService();
  await authService.restoreSession();

  // Register background sync task — FR-089
  await Workmanager().initialize(callbackDispatcher);
  await Workmanager().registerPeriodicTask(
    kBackgroundSyncTask,
    kBackgroundSyncTask,
    frequency: const Duration(hours: 1),
    constraints: Constraints(networkType: NetworkType.connected),
  );

  runApp(IrereroApp(authService: authService));
}

class IrereroApp extends StatelessWidget {
  const IrereroApp({super.key, required this.authService});

  final AuthService authService;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthService>.value(value: authService),
        ChangeNotifierProvider(create: (_) => SyncService()),
      ],
      child: Consumer<AuthService>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'Irerero',
            debugShowCheckedModeBanner: false,

            theme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF3E35A5), // Deep Indigo
                primary: const Color(0xFF3E35A5),
                secondary: const Color(0xFFe21e5a), // Vivid Pink
                brightness: Brightness.light,
                surface: const Color(0xFFF7F7F7),
              ),
              textTheme: GoogleFonts.sourceSans3TextTheme(
                Theme.of(context).textTheme,
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              appBarTheme: const AppBarTheme(
                centerTitle: true,
                elevation: 0,
                scrolledUnderElevation: 2,
              ),
              materialTapTargetSize: MaterialTapTargetSize.padded,
            ),

            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('en'),
            ],
            locale: auth.preferredLocale,
            localeResolutionCallback: (locale, supported) {
              // Always resolve to a locale supported by Material/Cupertino delegates.
              // (Kinyarwanda `rw` is not available in Flutter's bundled delegates.)
              return const Locale('en');
            },

            home: _AuthSessionGate(auth: auth),
          );
        },
      ),
    );
  }
}

/// Restores connectivity monitoring after cold start when tokens were cached.
class _AuthSessionGate extends StatefulWidget {
  const _AuthSessionGate({required this.auth});

  final AuthService auth;

  @override
  State<_AuthSessionGate> createState() => _AuthSessionGateState();
}

class _AuthSessionGateState extends State<_AuthSessionGate> {
  bool _monitorStarted = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.auth.isLoggedIn && !_monitorStarted) {
      _monitorStarted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<SyncService>().startMonitor(widget.auth);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.auth.isLoggedIn ? const HomeScreen() : const LoginScreen();
  }
}
