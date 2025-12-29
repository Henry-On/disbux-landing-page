<?php
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$token = trim($data['token'] ?? '');

if (!$token) {
  echo json_encode([
    "success" => false,
    "message" => "Invalid token"
  ]);
  exit();
}

$payload = json_encode([
  "token" => $token
]);

$backendAPI = $_SERVER['BACKEND_API_URL'];
$proxy_key = $_SERVER['INTERNAL_PROXY_KEY'];

$apiUrl = $backendAPI . "/user/profile/confirm-delete";
$ch = curl_init($apiUrl);

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "INTERNAL-PROXY-KEY: " . $proxy_key
  ]
]);

$response = curl_exec($ch);

$responseCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if (!$response) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Internal request failed",
  ]);
  exit;
}

$responseJson = json_decode($response, true);
http_response_code($responseCode);

if ($responseCode < 200 || $responseCode >= 300) {
  echo json_encode([
    "success" => false,
    "message" => $responseJson['message'] ?? 'Request failed'
  ]);
  exit();
}

echo json_encode([
  "success" => true,
  "message" => $responseJson['message'] ?? "Account deletion is successful"
]);
