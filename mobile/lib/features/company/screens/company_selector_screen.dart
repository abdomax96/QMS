import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/company_provider.dart';

class CompanySelectorScreen extends ConsumerWidget {
  const CompanySelectorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companiesAsync = ref.watch(companiesProvider);
    final profile = ref.watch(currentProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('اختيار الشركة'),
        actions: [
          IconButton(
            tooltip: 'تسجيل الخروج',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).signOut();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (profile != null)
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      (profile.label.isNotEmpty ? profile.label[0] : '?')
                          .toUpperCase(),
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(profile.label,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(profile.email,
                            style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'يرجى اختيار الشركة للمتابعة',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          Expanded(
            child: companiesAsync.when(
              loading: () => const LoadingView(message: 'جاري تحميل الشركات...'),
              error: (e, _) => ErrorStateView(
                error: e,
                onRetry: () => ref.invalidate(companiesProvider),
              ),
              data: (companies) {
                if (companies.isEmpty) {
                  return const EmptyState(
                    message: 'لا توجد شركات متاحة لحسابك.',
                    icon: Icons.business_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(companiesProvider),
                  child: ListView.builder(
                    itemCount: companies.length,
                    itemBuilder: (context, index) {
                      final company = companies[index];
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: AppTheme.primary,
                            child: Icon(Icons.factory_outlined,
                                color: Colors.white),
                          ),
                          title: Text(company.name,
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold)),
                          trailing: const Icon(Icons.arrow_back_ios, size: 16),
                          onTap: () async {
                            await ref
                                .read(selectedCompanyIdProvider.notifier)
                                .select(company.id);
                            if (context.mounted) {
                              context.go('/dashboard');
                            }
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
