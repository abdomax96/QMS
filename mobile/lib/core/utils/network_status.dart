import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provides the current connectivity state and a stream for reactive UIs.
class NetworkStatus {
  NetworkStatus(this._connectivity);

  final Connectivity _connectivity;

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return _hasConnection(results);
  }

  Stream<bool> get onStatusChange =>
      _connectivity.onConnectivityChanged.map(_hasConnection);

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}

final connectivityProvider = Provider<Connectivity>((ref) => Connectivity());

final networkStatusProvider = Provider<NetworkStatus>(
  (ref) => NetworkStatus(ref.watch(connectivityProvider)),
);

/// Reactive online/offline boolean stream.
final isOnlineProvider = StreamProvider<bool>((ref) async* {
  final status = ref.watch(networkStatusProvider);
  yield await status.isOnline;
  yield* status.onStatusChange;
});
