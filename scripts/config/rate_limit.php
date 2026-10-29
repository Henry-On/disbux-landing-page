<?php
// File-based per-IP throttle for shared hosting (no Redis needed).
// Limits how often one client can hit email-triggering endpoints.
// Fails open if the temp directory is not writable.

function check_rate_limit(string $name, int $maxAttempts, int $windowSeconds): bool {
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  // NOTE: REMOTE_ADDR is used deliberately. Trusting X-Forwarded-For here
  // would let clients spoof their identity and bypass the limit.
  $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'disbux_ratelimit';
  if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
    return true;
  }
  $file = $dir . DIRECTORY_SEPARATOR . $name . '_' . md5($ip) . '.json';
  $now = time();

  $fp = @fopen($file, 'c+');
  if (!$fp) {
    return true;
  }
  flock($fp, LOCK_EX);
  $raw = stream_get_contents($fp);
  $hits = json_decode($raw ?: '[]', true);
  if (!is_array($hits)) {
    $hits = [];
  }
  $hits = array_values(array_filter($hits, function ($t) use ($now, $windowSeconds) {
    return is_numeric($t) && ($now - (int) $t) < $windowSeconds;
  }));

  $allowed = count($hits) < $maxAttempts;
  if ($allowed) {
    $hits[] = $now;
  }
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode($hits));
  flock($fp, LOCK_UN);
  fclose($fp);

  // Best-effort cleanup of stale buckets (1% of requests).
  if (random_int(1, 100) === 1) {
    foreach (glob($dir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $old) {
      if ($now - (int) @filemtime($old) > 3600) {
        @unlink($old);
      }
    }
  }

  return $allowed;
}
