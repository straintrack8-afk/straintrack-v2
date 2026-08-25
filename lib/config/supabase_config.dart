import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase configuration constants
class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://rhhxbfiqqpuohisbkjie.supabase.co',
  );
  
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHhiZmlxcXB1b2hpc2JramllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDYyNjEsImV4cCI6MjA4MDQ4MjI2MX0.4pI_IWdsdG0Ajn2U-vEVvGsIDDhxNZExtfHMK-F61BQ',
  );

  /// Initialize Supabase
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
  }

  /// Get Supabase client instance
  static SupabaseClient get client => Supabase.instance.client;
}
