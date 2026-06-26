import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/company/providers/company_provider.dart';
import '../theme/app_theme.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key, required this.current});

  final String current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentProfileProvider);
    final company = ref.watch(selectedCompanyProvider);

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              color: AppTheme.primary,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white,
                    child: Text(
                      (profile?.label.isNotEmpty == true
                              ? profile!.label[0]
                              : '?')
                          .toUpperCase(),
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    profile?.label ?? '',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (profile?.title != null)
                    Text(
                      profile!.title!,
                      style: const TextStyle(color: Colors.white70),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.factory_outlined,
                        color: Colors.white70,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          company?.name ?? 'لم يتم اختيار شركة',
                          style: const TextStyle(color: Colors.white70),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            _item(
              context,
              Icons.dashboard_outlined,
              'لوحة المعلومات',
              '/dashboard',
            ),
            _item(context, Icons.list_alt, 'سجل حالات NCR', '/ncr'),
            _item(
              context,
              Icons.inventory_2_outlined,
              'الكميات المحتجزة',
              '/holds',
            ),
            _item(
              context,
              Icons.drafts_outlined,
              'المسودات غير المتزامنة',
              '/drafts',
            ),
            const Spacer(),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.swap_horiz),
              title: const Text('تغيير الشركة'),
              onTap: () async {
                Navigator.of(context).pop();
                await ref.read(selectedCompanyIdProvider.notifier).clear();
                if (context.mounted) context.go('/companies');
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: AppTheme.severityHigh),
              title: const Text(
                'تسجيل الخروج',
                style: TextStyle(color: AppTheme.severityHigh),
              ),
              onTap: () async {
                await ref.read(authControllerProvider.notifier).signOut();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _item(
    BuildContext context,
    IconData icon,
    String label,
    String route,
  ) {
    final selected = current == route;
    return ListTile(
      leading: Icon(icon, color: selected ? AppTheme.primary : null),
      title: Text(
        label,
        style: TextStyle(
          color: selected ? AppTheme.primary : null,
          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: selected,
      selectedTileColor: AppTheme.primary.withValues(alpha: 0.08),
      onTap: () {
        Navigator.of(context).pop();
        if (!selected) context.go(route);
      },
    );
  }
}
