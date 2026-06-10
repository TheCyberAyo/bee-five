import 'package:flutter/material.dart';
import '../services/multiplayer_service.dart';

/// Prompt for school join code after sign-in (splash) or from Home.
///
/// Pops with [JoinSchoolOutcome] on successful join, or `null` if skipped.
class JoinSchoolDialog extends StatefulWidget {
  const JoinSchoolDialog({super.key, this.allowSkip = true});

  /// When false (Live Matches setup), the player must join a school or default lobby.
  final bool allowSkip;

  @override
  State<JoinSchoolDialog> createState() => _JoinSchoolDialogState();
}

class _JoinSchoolDialogState extends State<JoinSchoolDialog> {
  final _codeController = TextEditingController();
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Please enter your school’s join code');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final outcome = await MultiplayerService().joinSchool(code);

    if (!mounted) return;

    setState(() => _loading = false);

    if (outcome.isSuccess) {
      Navigator.pop(context, outcome);
    } else {
      setState(() => _error = outcome.errorMessage);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text(
        '🏫 Join Your School',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Enter your school join code, or use the default lobby if you do not have one yet.',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFFFFC30B),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _codeController,
            decoration: InputDecoration(
              labelText: 'School join code',
              hintText: 'e.g. 40ZAM26',
              errorText: _error,
              prefixIcon: const Icon(Icons.school_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: Color(0xFFFFC30B),
                  width: 2,
                ),
              ),
            ),
            textCapitalization: TextCapitalization.characters,
            autocorrect: false,
            enabled: !_loading,
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _loading
              ? null
              : () async {
                  setState(() {
                    _loading = true;
                    _error = null;
                  });
                  final outcome = await MultiplayerService().joinDefaultLobby();
                  if (!context.mounted) return;
                  setState(() => _loading = false);
                  if (outcome.isSuccess) {
                    Navigator.of(context).pop(outcome);
                  } else {
                    setState(() => _error = outcome.errorMessage);
                  }
                },
          child: const Text(
            'Use default lobby',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        if (widget.allowSkip)
          TextButton(
            onPressed: _loading ? null : () => Navigator.pop<JoinSchoolOutcome?>(context),
            child: const Text(
              'Skip for now',
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ElevatedButton(
          onPressed: _loading ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFFC30B),
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Colors.black, width: 2),
            ),
          ),
          child: _loading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.black,
                  ),
                )
              : const Text(
                  'Join school',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
        ),
      ],
    );
  }
}
