# 2026-10-16 — Write backslash-heavy test strings with the Write/Edit tool, then check them with `od -c`

While adding search-escaping tests, doubled backslashes inside a shell heredoc piped to Python were collapsed on the way into the file, twice, so the expected pattern `"%100\\%%"` (escaped `%`) became `"%100\%%"`, which JavaScript reads as `"%100%%"` (a test that proves nothing). For strings with backslashes (LIKE patterns, regexes, Windows paths) use the Write or Edit tool, and confirm the bytes with `od -c` when a test about escaping passes on the first try.
