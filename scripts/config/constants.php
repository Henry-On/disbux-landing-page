<?php

function getLocalIP() {
  $socket = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
  socket_connect($socket, '8.8.8.8', 53);
  socket_getsockname($socket, $ip);
  socket_close($socket);
  return $ip;
}

// Dev Environment: set backend API URL to use IP address of development server
$localEnvironmentServerAPI = "http://" . getLocalIP() . ":4000/api";

$backendAPI = $_SERVER["HTTP_HOST"] === "localhost" ? $localEnvironmentServerAPI : $_SERVER['BACKEND_API_URL'];

define("API_BASE_URL", $backendAPI);
define("LOCAL_IP", getLocalIP());