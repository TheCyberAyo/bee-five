/// Serialize / parse 10×10 Bee Five boards for [mg_async_matches.board].
library;

const int asyncBoardSize = 10;

List<List<int>> emptyAsyncBoard() =>
    List.generate(asyncBoardSize, (_) => List.filled(asyncBoardSize, 0));

List<List<int>> parseAsyncBoard(dynamic raw) {
  if (raw is! List || raw.length != asyncBoardSize) {
    return emptyAsyncBoard();
  }
  return List.generate(asyncBoardSize, (r) {
    final row = raw[r];
    if (row is! List || row.length != asyncBoardSize) {
      return List.filled(asyncBoardSize, 0);
    }
    return List.generate(asyncBoardSize, (c) {
      final v = row[c];
      if (v is int && (v == 1 || v == 2)) return v;
      if (v is num) {
        final n = v.toInt();
        if (n == 1 || n == 2) return n;
      }
      return 0;
    });
  });
}

List<List<dynamic>> boardToJson(List<List<int>> board) =>
    board.map((row) => List<dynamic>.from(row)).toList();
