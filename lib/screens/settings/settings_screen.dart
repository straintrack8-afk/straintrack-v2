import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../config/supabase_config.dart';
import '../../config/theme.dart';
import '../../providers/providers.dart';

/// Members provider
final membersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final orgId = ref.watch(organizationProvider).activeOrg?.id;
  if (orgId == null) return [];

  final response = await SupabaseConfig.client
      .from('user_organizations')
      .select('*, user:users(*)')
      .eq('organization_id', orgId)
      .order('joined_at');

  return (response as List).cast<Map<String, dynamic>>();
});

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orgState = ref.watch(organizationProvider);

    if (orgState.activeOrg == null) {
      return const Center(
        child: Text('Please select an organization'),
      );
    }

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Settings',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          // Tabs
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Organization'),
              Tab(text: 'Members'),
            ],
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Organization Settings Tab
                _OrganizationTab(
                  org: orgState.activeOrg!,
                  isAdmin: orgState.activeOrg!.isAdmin,
                ),
                // Members Tab
                const _MembersTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrganizationTab extends StatelessWidget {
  final dynamic org;
  final bool isAdmin;

  const _OrganizationTab({required this.org, required this.isAdmin});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Organization Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.business, color: AppTheme.primaryColor, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              org.name,
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (org.description != null)
                              Text(
                                org.description,
                                style: TextStyle(color: AppTheme.textSecondary),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 32),
                  
                  // Details
                  if (org.address != null)
                    _InfoRow(icon: Icons.location_on, label: 'Address', value: org.address),
                  if (org.phone != null)
                    _InfoRow(icon: Icons.phone, label: 'Phone', value: org.phone),
                  _InfoRow(
                    icon: Icons.calendar_today,
                    label: 'Created',
                    value: DateFormat('MMMM d, yyyy').format(org.createdAt),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Share Code Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Invite Members',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Share this code with team members to invite them to your organization.',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          org.shareCode,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 4,
                          ),
                        ),
                        const SizedBox(width: 16),
                        IconButton(
                          icon: const Icon(Icons.copy),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: org.shareCode));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Share code copied!')),
                            );
                          },
                          tooltip: 'Copy share code',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MembersTab extends ConsumerWidget {
  const _MembersTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(membersProvider);
    final orgState = ref.watch(organizationProvider);
    // isAdmin can be used for admin-only actions like promote/delete members
    final _ = orgState.activeOrg?.isAdmin ?? false;

    return membersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppTheme.error),
            const SizedBox(height: 12),
            const Text('Error loading members'),
            TextButton(
              onPressed: () => ref.invalidate(membersProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (members) {
        if (members.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.group_outlined, size: 64, color: AppTheme.textSecondary),
                const SizedBox(height: 16),
                Text(
                  'No members yet',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Share the organization code to invite members',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: members.length,
          itemBuilder: (context, index) {
            final member = members[index];
            final user = member['user'] as Map<String, dynamic>?;
            final role = member['role'] as String? ?? 'member';
            final joinedAt = DateTime.parse(member['joined_at'] as String);

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: role == 'admin' 
                      ? AppTheme.primaryColor 
                      : AppTheme.textSecondary,
                  child: Text(
                    (user?['full_name']?.toString().isNotEmpty == true
                            ? user!['full_name'].toString()[0]
                            : user?['email']?.toString()[0] ?? '?')
                        .toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                title: Text(
                  user?['full_name'] ?? user?['email'] ?? 'Unknown',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (user?['email'] != null)
                      Text(
                        user!['email'],
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    Text(
                      'Joined ${DateFormat('MMM d, yyyy').format(joinedAt)}',
                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: role == 'admin'
                        ? AppTheme.primaryColor.withOpacity(0.1)
                        : AppTheme.textSecondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    role.toUpperCase(),
                    style: TextStyle(
                      color: role == 'admin' ? AppTheme.primaryColor : AppTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                isThreeLine: true,
              ),
            );
          },
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 8),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
