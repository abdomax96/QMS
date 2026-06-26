import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/labels.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/ncr_models.dart';
import '../providers/ncr_provider.dart';
import '../widgets/ncr_list_tile.dart';

class NcrListScreen extends ConsumerStatefulWidget {
  const NcrListScreen({super.key});

  @override
  ConsumerState<NcrListScreen> createState() => _NcrListScreenState();
}

class _NcrListScreenState extends ConsumerState<NcrListScreen> {
  String _query = '';
  String _statusFilter = 'all';

  List<NcrReport> _filter(List<NcrReport> reports) {
    return reports.where((r) {
      final matchesStatus =
          _statusFilter == 'all' || r.status == _statusFilter;
      final q = _query.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          r.number.toLowerCase().contains(q) ||
          (r.title?.toLowerCase().contains(q) ?? false) ||
          (r.department?.toLowerCase().contains(q) ?? false) ||
          (r.productName?.toLowerCase().contains(q) ?? false);
      return matchesStatus && matchesQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final listAsync = ref.watch(ncrListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('سجل حالات NCR')),
      drawer: const AppDrawer(current: '/ncr'),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/ncr/create'),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'بحث برقم التقرير أو القسم...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _statusChip('all', 'الكل'),
                      ...Labels.statusNames.entries.map(
                        (e) => _statusChip(e.key, e.value),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: listAsync.when(
              loading: () => const LoadingView(),
              error: (e, _) => ErrorStateView(
                error: e,
                onRetry: () => ref.invalidate(ncrListProvider),
              ),
              data: (reports) {
                final filtered = _filter(reports);
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(ncrListProvider);
                    await ref.read(ncrListProvider.future);
                  },
                  child: filtered.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            EmptyState(
                              message: 'لا توجد حالات مطابقة.',
                              icon: Icons.search_off,
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.only(bottom: 90),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final r = filtered[index];
                            return NcrListTile(
                              report: r,
                              onTap: () => context.go('/ncr/details/${r.id}'),
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

  Widget _statusChip(String value, String label) {
    final selected = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _statusFilter = value),
      ),
    );
  }
}
