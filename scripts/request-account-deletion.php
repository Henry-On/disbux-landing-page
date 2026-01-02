<?php
header('Content-Type: application/json');
$config = require __DIR__."/config/app.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');

if (!$email || !$message) {
  echo json_encode([
    "success" => false,
    "message" => "Both email and message is required"
  ]);
  exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode([
    "success" => false,
    "message" => "Please provide a valid email address"
  ]);
  exit();
}

$payload = json_encode([
  "email" => $email,
  "reason" => $message
]);

$ch = curl_init(API_BASE_URL . "/user/profile/request-delete");

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "Internal-Proxy-Key: " . $config["internal-proxy-key"]
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
  "message" => $responseJson['message'] ?? "Please check your inbox to continue"
]);
