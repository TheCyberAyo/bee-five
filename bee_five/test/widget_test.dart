import 'package:flutter_test/flutter_test.dart';
import 'package:bee_five/utils/country_data.dart';

void main() {
  group('countryCodeToFlagEmoji', () {
    test('maps ZA to South African flag', () {
      expect(countryCodeToFlagEmoji('ZA'), '🇿🇦');
    });

    test('maps US to US flag', () {
      expect(countryCodeToFlagEmoji('us'), '🇺🇸');
    });

    test('returns empty for invalid code', () {
      expect(countryCodeToFlagEmoji(''), isEmpty);
      expect(countryCodeToFlagEmoji('123'), isEmpty);
    });
  });

  group('usernameWithFlag', () {
    test('appends flag after username', () {
      expect(usernameWithFlag('Ayo', 'ZA'), 'Ayo 🇿🇦');
    });

    test('returns username alone when no country', () {
      expect(usernameWithFlag('Ayo', null), 'Ayo');
    });
  });

  group('filterCountries', () {
    test('finds by name fragment', () {
      final results = filterCountries('south af');
      expect(results.any((c) => c.code == 'ZA'), isTrue);
    });
  });
}
