import 'package:flutter/material.dart';

import '../utils/country_data.dart';

/// Searchable bottom sheet; returns selected ISO country code or null if dismissed.
Future<String?> showCountryPickerSheet(
  BuildContext context, {
  String? initialCode,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => CountryPickerSheet(initialCode: initialCode),
  );
}

class CountryPickerSheet extends StatefulWidget {
  const CountryPickerSheet({super.key, this.initialCode});

  final String? initialCode;

  @override
  State<CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<CountryPickerSheet> {
  final _searchController = TextEditingController();
  late List<CountryEntry> _filtered = kSignupCountries;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String q) {
    setState(() => _filtered = filterCountries(q));
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.75;
    return SafeArea(
      child: SizedBox(
        height: height,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Search country…',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: _onSearchChanged,
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _filtered.length,
                itemBuilder: (context, index) {
                  final c = _filtered[index];
                  final selected = c.code == widget.initialCode;
                  return ListTile(
                    leading: Text(
                      c.flagEmoji,
                      style: const TextStyle(fontSize: 22),
                    ),
                    title: Text(c.name),
                    trailing: selected
                        ? const Icon(Icons.check, color: Color(0xFFFFC30B))
                        : null,
                    onTap: () => Navigator.pop(context, c.code),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
