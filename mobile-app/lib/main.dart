// lib/main.dart
//
// Irerero Mobile App — Entry point
// Flutter 3.x, Android 8.0+, Material Design 3 (Material You)
// SRS §5.1: "shall follow Google Material Design 3 (Material You) guidelines"
// NFR-013: Default language is Kinyarwanda

import 'dart:async';
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
              colorScheme: const ColorScheme.light(
                primary: Color(0xFFE8573A),
                onPrimary: Colors.white,
                primaryContainer: Color(0xFFFFE8E0),
                onPrimaryContainer: Color(0xFF1C3A2C),
                secondary: Color(0xFF2D6B4F),
                onSecondary: Colors.white,
                secondaryContainer: Color(0xFFEBF7E0),
                onSecondaryContainer: Color(0xFF1C3A2C),
                tertiary: Color(0xFF3DAF8A),
                onTertiary: Colors.white,
                error: Color(0xFFE8573A),
                onError: Colors.white,
                surface: Color(0xFFFDF6EE),
                onSurface: Color(0xFF4A4A3F),
                onSurfaceVariant: Color(0xFF7A7A6E),
                outline: Color(0xFFC8C8B8),
                outlineVariant: Color(0xFFE8E4DC),
                shadow: Color.fromRGBO(28, 58, 44, 0.08),
                scrim: Color.fromRGBO(28, 58, 44, 0.4),
              ),
              scaffoldBackgroundColor: const Color(0xFFFDF6EE),
              textTheme: GoogleFonts.nunitoSansTextTheme().apply(
                bodyColor: const Color(0xFF4A4A3F),
                displayColor: const Color(0xFF1C3A2C),
              ),
              primaryTextTheme: GoogleFonts.nunitoTextTheme().apply(
                bodyColor: const Color(0xFF4A4A3F),
                displayColor: const Color(0xFF1C3A2C),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  elevation: 0,
                  backgroundColor: const Color(0xFFE8573A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w600, letterSpacing: 0.01),
                ),
              ),
              navigationBarTheme: NavigationBarThemeData(
                backgroundColor: const Color(0xFFFDF6EE),
                surfaceTintColor: Colors.transparent,
                indicatorColor: const Color(0x1AE8573A),
                labelTextStyle: WidgetStateProperty.resolveWith((s) {
                  if (s.contains(WidgetState.selected)) {
                    return const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFE8573A), fontSize: 12);
                  }
                  return const TextStyle(fontWeight: FontWeight.w500, color: Color(0xFF7A7A6E), fontSize: 12);
                }),
                iconTheme: WidgetStateProperty.resolveWith((s) {
                  if (s.contains(WidgetState.selected)) {
                    return const IconThemeData(color: Color(0xFFE8573A), size: 24);
                  }
                  return const IconThemeData(color: Color(0xFF4A4A3F), size: 24);
                }),
              ),
              appBarTheme: AppBarTheme(
                centerTitle: true,
                elevation: 0,
                scrolledUnderElevation: 0,
                backgroundColor: const Color(0xFFFDF6EE),
                foregroundColor: const Color(0xFF1C3A2C),
                surfaceTintColor: Colors.transparent,
                titleTextStyle: GoogleFonts.nunito(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF1C3A2C),
                  letterSpacing: 0.01,
                ),
              ),
              cardTheme: CardThemeData(
                color: const Color(0xFFFFFBF7),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE8E4DC)),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: const Color(0xFFFFFBF7),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFC8C8B8), width: 1.5),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFC8C8B8), width: 1.5),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF3DAF8A), width: 1.5),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFE8573A), width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                labelStyle: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF4A4A3F),
                ),
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

class _AuthSessionGate extends StatefulWidget {
  const _AuthSessionGate({required this.auth});

  final AuthService auth;

  @override
  State<_AuthSessionGate> createState() => _AuthSessionGateState();
}

class _AuthSessionGateState extends State<_AuthSessionGate> {
  bool _monitorStarted = false;
  Timer? _inactivityTimer;

  void _resetTimer() {
    _inactivityTimer?.cancel();
    if (widget.auth.isLoggedIn) {
      _inactivityTimer = Timer(const Duration(minutes: 30), () {
        widget.auth.logout();
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.auth.isLoggedIn && !_monitorStarted) {
      _monitorStarted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<SyncService>().startMonitor(widget.auth);
      });
      _resetTimer();
    }
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.auth.isLoggedIn) {
      _inactivityTimer?.cancel();
      return const LoginScreen();
    }
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _resetTimer(),
      onPointerMove: (_) => _resetTimer(),
      onPointerUp: (_) => _resetTimer(),
      child: const HomeScreen(),
    );
  }
}
